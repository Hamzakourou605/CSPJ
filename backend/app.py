
import os, csv, io
from flask import Flask, jsonify, request, send_file, make_response
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from datetime import timedelta

try:
    from fpdf import FPDF  # fpdf2 >= 2.x
    from arabic_reshaper import reshape
    from bidi.algorithm import get_display
    HAS_PDF_LIBS = True
except ImportError:
    HAS_PDF_LIBS = False

from database import (
    get_db, fetch_all, fetch_one, load_rapports,
    save_analyse, save_historique, get_stats, save_feedback,
    verify_user
)
from models.nlp import run_nlp
from models.ml import predict_one, predict_batch, train as ml_train

app = Flask(__name__)
app.config["JWT_SECRET_KEY"]            = "cspj_secret_2024"
app.config["JWT_ACCESS_TOKEN_EXPIRES"]  = timedelta(hours=8)

CORS(app, resources={r"/*": {"origins": "*"}})
jwt = JWTManager(app)


@app.after_request
def no_cache(response):
    """Désactive le cache HTTP pour toutes les réponses API → données toujours fraîches depuis SQL Server."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"]         = "no-cache"
    response.headers["Expires"]        = "0"
    return response


def _final_pred(coherence, rf_pred, anomalie):
    """Fusionne cohérence NLP + Random Forest pour la prédiction finale."""
    if coherence == "تناقض" or anomalie:
        return "مراجعة مطلوبة"
    if coherence == "شك" or rf_pred == "قيد المراقبة":
        return "قيد المراقبة"
    return rf_pred if rf_pred else "موثوق"


@app.route("/api/login", methods=["POST"])
def login():
    try:
        d = request.get_json() or {}
        username = d.get("username", "")
        password = d.get("password", "")
        print(f"[DEBUG] App.py login reçu: '{username}' / '{password}'")

        u = verify_user(username, password)
        print(f"[DEBUG] App.py verify_user result: {u}")
    except Exception as e:
        print(f"[ERROR] Login route failed: {e}")
        return jsonify({"error": "Erreur serveur interne"}), 500
    
    if not u:
        return jsonify({"error": "بيانات الدخول غير صحيحة"}), 401

    # On assigne un rôle par défaut si la table USERS n'a pas de colonne rôle
    role = "admin" if u["nom"] == "admin" else "analyste"
    nom_affiche = "مدير النظام" if u["nom"] == "admin" else "محلل البيانات"

    token = create_access_token(
        identity=u["nom"], 
        additional_claims={"role": role, "nom": nom_affiche}
    )
    return jsonify({"token": token, "username": u["nom"],
                    "role": role, "nom": nom_affiche})


@app.route("/api/me", methods=["GET"])
@jwt_required()
def me():
    claims = get_jwt()
    return jsonify({
        "username": get_jwt_identity(),
        "role": claims.get("role"),
        "nom": claims.get("nom")
    })


def _analyse_row(r):
   
    nlp = run_nlp(
        float(r.get("score_total", 0)),
        float(r.get("note_obtenue", 0)),
        int(r.get("points_evolution", 20)),
        r.get("description_evaluation", "")
    )
    r.update(nlp)
    ml = predict_one(r)
    r.update(ml)
    r["prediction_finale"] = _final_pred(
        nlp["coherence_statut"], ml["rf_prediction"], ml["anomalie"]
    )
    return r

def ensure_all_analyzed(annee=2024):
    """
    S'assure que TOUS les rapports sont analysés et présents dans dbo.AnalyseIA.
    ORDRE OBLIGATOIRE : NLP en premier (pour remplir coherence_pct / gap / sentiment_score),
    PUIS ML (qui a besoin de ces valeurs comme features).
    """
    rows = load_rapports(annee)
    needs_analyse = [r for r in rows if not r.get("sentiment_label")]

    if needs_analyse:
        # ── 1. NLP d'abord ───────────────────────────────────────────────
        for r in needs_analyse:
            try:
                nlp = run_nlp(
                    r.get("score_total", 0),
                    r.get("note_obtenue", 0),
                    r.get("points_evolution", 20),
                    r.get("description_evaluation", "")
                )
                r.update(nlp)
            except Exception as e:
                print(f"[ERROR] run_nlp for rapport {r.get('rapport_id')}: {e}")

        # ── 2. ML ensuite (coherence_pct est maintenant rempli) ───────────
        try:
            ml_results = predict_batch(needs_analyse)
            for r, ml in zip(needs_analyse, ml_results):
                try:
                    # En cas d'erreur ML, on garde les valeurs par défaut
                    if not ml or "error" in ml:
                        print(f"[WARN] ML error for {r.get('rapport_id')}: {ml.get('error', 'unknown')}")
                        ml = {
                            "rf_prediction": "موثوق",
                            "rf_confidence": 0.5,
                            "cluster_id": 0,
                            "cluster_label": "—",
                            "anomalie": False,
                            "anomalie_score": 0.0
                        }
                    
                    r.update(ml)
                    r["prediction_finale"] = _final_pred(
                        r.get("coherence_statut", "متسق"), 
                        ml.get("rf_prediction"), 
                        ml.get("anomalie", False)
                    )
                    # Sauvegarder quoi qu'il arrive (NLP est déjà dans r)
                    save_analyse(r["rapport_id"], r["juge_id"], annee, r)
                except Exception as e:
                    print(f"[ERROR] updating/saving ml result for {r.get('rapport_id')}: {e}")
        except Exception as e:
            print(f"[ERROR] predict_batch failed: {e}")

    return rows

@app.route("/api/rapports", methods=["GET"])
@jwt_required()
def get_rapports():
    annee = request.args.get("annee", 2024, type=int)
    rows = ensure_all_analyzed(annee)

    # Sérialisation complète
    for r in rows:
        for k, v in list(r.items()):
            if v is None:
                r[k] = None
            elif hasattr(v, 'item'):
                r[k] = v.item()
            elif isinstance(v, (int, float, str, bool)):
                r[k] = v
            else:
                r[k] = str(v)

    print(f"[API] get_rapports({annee}): {len(rows)} rapports retournés")
    return jsonify({"annee": annee, "count": len(rows), "rapports": rows})


@app.route("/api/rapports/<int:rapport_id>", methods=["GET"])
@jwt_required()
def get_rapport(rapport_id):
    row = fetch_one("""
        SELECT r.*, j.nom_complet, j.role, j.tribunal, j.grade, j.points_evolution,
               a.sentiment_label, a.sentiment_score, a.tfidf_top_words,
               a.coherence_statut, a.coherence_pct,
               a.nasaq_type, a.R_value, a.R_prime_value, a.M_value,
               a.rf_prediction, a.rf_confidence, a.cluster_id, a.cluster_label,
               a.anomalie, a.anomalie_score, a.prediction_finale, a.verdict_texte
        FROM dbo.Rapports r
        INNER JOIN dbo.Juges j ON r.juge_id = j.juge_id
        LEFT  JOIN dbo.AnalyseIA a ON r.rapport_id = a.rapport_id
        WHERE r.rapport_id = ?
    """, [rapport_id])

    if not row:
        return jsonify({"error": "غير موجود"}), 404

    if not row.get("sentiment_label"):
        row.update(_analyse_row(row))
        save_analyse(row["rapport_id"], row["juge_id"],
                     row.get("annee_evaluation", 2024), row)
    return jsonify(row)


@app.route("/api/stats", methods=["GET"])
@jwt_required()
def stats():
    annee = request.args.get("annee", 2024, type=int)
    # S'assurer que les analyses sont à jour pour plus de précision dans les stats
    ensure_all_analyzed(annee)
    data = get_stats(annee)
    
    # Sérialisation complète
    if data:
        for k, v in list(data.items()):
            if v is None:
                data[k] = 0
            elif hasattr(v, 'item'):
                data[k] = v.item()
            elif isinstance(v, (int, float, str, bool)):
                pass  # Déjà bon
            else:
                data[k] = str(v)
    
    print(f"[API] /api/stats retourne: {data}")
    return jsonify(data or {})

@app.route("/api/analyser", methods=["POST"])
@jwt_required()
def analyser():
    username = get_jwt_identity()
    d = request.get_json() or {}
    row = {
        "score_total":           float(d.get("score_total", 0)),
        "score_efficacite":      float(d.get("score_efficacite", 0)),
        "score_integrite":       float(d.get("score_integrite", 0)),
        "score_conduite":        float(d.get("score_conduite", 0)),
        "note_obtenue":          float(d.get("note_obtenue", 0)),
        "points_evolution":      int(d.get("points_evolution", 20)),
        "description_evaluation": d.get("description_evaluation", ""),
        "coherence_pct":         50,
        "gap":                   0.3,
        "sentiment_score":       0.5,
    }
    result = _analyse_row(row)
    # Sauvegarder dans l'historique
    save_historique(username, d, result)
    return jsonify(result)


@app.route("/api/rapports/<int:rapport_id>/feedback", methods=["POST"])
@jwt_required()
def feedback(rapport_id):
    claims = get_jwt()
    if claims.get("role") != "admin":
         return jsonify({"error": "غير مصرح"}), 403
    
    d = request.get_json() or {}
    verdict = d.get("verdict", "")
    if not verdict:
        return jsonify({"error": "القرار مطلوب"}), 400
        
    ok = save_feedback(rapport_id, verdict)
    return jsonify({"status": "success" if ok else "error"})

@app.route("/api/historique", methods=["GET"])
@jwt_required()
def historique():
    try:
        # S'assurer que les analyses sont à jour
        analyzed_rows = ensure_all_analyzed(2024)
        print(f"[API] ensure_all_analyzed returned {len(analyzed_rows)} rows")

        # Essayer de récupérer depuis AnalyseIA en premier
        rows = fetch_all("""
            SELECT 
                a.analyse_id as hist_id,
                a.rapport_id,
                j.juge_id,
                j.nom_complet as user_id,
                j.nom_complet,
                j.role,
                j.tribunal,
                j.grade,
                r.score_total,
                r.score_efficacite,
                r.score_integrite,
                r.score_conduite,
                r.note_obtenue,
                j.points_evolution,
                r.description_evaluation,
                r.description_evaluation as description,
                a.sentiment_label,
                a.sentiment_score,
                a.tfidf_top_words,
                a.coherence_statut,
                a.coherence_pct,
                a.nasaq_type,
                a.prediction_finale,
                a.verdict_texte,
                a.analyse_le,
                a.rf_prediction,
                a.rf_confidence,
                a.cluster_label,
                a.anomalie,
                r.annee_evaluation
            FROM dbo.AnalyseIA a
            INNER JOIN dbo.Rapports r ON a.rapport_id = r.rapport_id
            INNER JOIN dbo.Juges j ON a.juge_id = j.juge_id
            ORDER BY a.analyse_le DESC
        """)

        print(f"[API] /api/historique: {len(rows)} enregistrements trouvés dans AnalyseIA")

        # Fallback: si AnalyseIA est vide, retourner les rapports analysés depuis ensure_all_analyzed
        if not rows and analyzed_rows:
            print(f"[API] AnalyseIA vide, fallback sur les rapports analysés ({len(analyzed_rows)} rows)")
            rows = analyzed_rows

        # Sérialisation complète
        for r in rows:
            if r.get("analyse_le"):
                r["analyse_le"] = str(r["analyse_le"])
            for k, v in list(r.items()):
                if v is None:
                    r[k] = None
                elif hasattr(v, 'item'):
                    r[k] = v.item()
                elif isinstance(v, (int, float, str, bool)):
                    pass  # Déjà bon
                else:
                    r[k] = str(v)

        print(f"[API] /api/historique response: {len(rows)} historiques retournés")
        return jsonify({"historique": rows})
    except Exception as e:
        print(f"[API] /api/historique ERROR: {e}", exc_info=True)
        return jsonify({"error": str(e), "historique": []}), 500


@app.route("/api/export/csv", methods=["GET"])
@jwt_required()
def export_csv():

    ensure_all_analyzed(2024)
    
    rows = fetch_all("""
        SELECT 
            j.nom_complet as [القاضي],
            r.annee_evaluation as [السنة],
            r.score_total as [النقاط],
            a.sentiment_label as [الشعور],
            a.coherence_statut as [التماسك],
            a.prediction_finale as [التنبؤ],
            a.anomalie as [شذوذ],
            r.description_evaluation as [الوصف]
        FROM dbo.AnalyseIA a
        INNER JOIN dbo.Rapports r ON a.rapport_id = r.rapport_id
        INNER JOIN dbo.Juges j ON r.juge_id = j.juge_id
        WHERE a.coherence_statut = N'تناقض'
        ORDER BY a.analyse_le DESC
    """)
    
    output = io.StringIO()
    output.write('\ufeff')
    
    if not rows:
        return jsonify({"msg": "Aucune donnée à exporter"}), 404

    writer = csv.DictWriter(output, fieldnames=rows[0].keys(), delimiter=';')
    writer.writeheader()
    writer.writerows(rows)
    
    csv_bytes = output.getvalue().encode('utf-8-sig')
    resp = make_response(csv_bytes)
    resp.headers['Content-Type'] = 'text/csv; charset=utf-8-sig'
    resp.headers['Content-Disposition'] = 'attachment; filename=rapports_incoherents.csv'
    return resp


@app.route("/api/export/pdf", methods=["GET"])
@jwt_required()
def export_pdf():
    if not HAS_PDF_LIBS:
        return jsonify({"error": "PDF libraries not installed"}), 500

    ensure_all_analyzed(2024)

    rows = fetch_all("""
        SELECT 
            j.nom_complet, j.tribunal, j.grade,
            r.annee_evaluation, r.score_total, r.note_obtenue,
            a.sentiment_label, a.coherence_statut, a.coherence_pct,
            a.nasaq_type, a.prediction_finale, a.anomalie,
            a.rf_prediction, r.description_evaluation
        FROM dbo.AnalyseIA a
        INNER JOIN dbo.Rapports r ON a.rapport_id = r.rapport_id
        INNER JOIN dbo.Juges j ON r.juge_id = j.juge_id
        WHERE a.coherence_statut = N'تناقض'
        ORDER BY a.analyse_le DESC
    """)

    if not rows:
        return jsonify({"msg": "لا توجد بيانات (تناقض) حالياً"}), 404

    def ar(text):
        """Reshape and reverse Arabic text for FPDF."""
        if not text: return ""
        try:
            # Simple conversion string
            t = str(text)
            # Reshape and Reorder for RTL
            return get_display(reshape(t))
        except:
            return str(text)

    # PRIORITE SUR TAJAWAL CAR MIEUX POUR L'ARABE
    font_dir = os.path.join(app.root_path, "assets", "fonts")
    font_files = ["Tajawal-Regular.ttf", "Cairo-Regular.ttf", "helvetica-neue-lt-regular.ttf"]
    font_path = None
    for f in font_files:
        p = os.path.join(font_dir, f)
        if os.path.exists(p):
            font_path = p
            break

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Configuration du nom de la police
    font_name = "Helvetica"
    if font_path:
        try:
            pdf.add_font("CustomFont", "", font_path)
            font_name = "CustomFont"
        except Exception as e:
            print(f"Error loading font: {e}")

    def set_font(size=10, bold=False):
        # fpdf2: If we only have Regular, don't use style='B' as it triggers 'Undefined font'
        # Instead, we simulate emphasis by increasing size if bold is True
        pdf.set_font(font_name, style="", size=size + (1 if bold else 0))

    # 1. HEADER BLEU FONCE (DESIGN PREMIUM)
    pdf.set_fill_color(26, 58, 92)
    pdf.rect(0, 0, 210, 35, "F")

    set_font(18, bold=True)
    pdf.set_text_color(200, 168, 75)  # Or / Jaune
    pdf.set_y(8)
    pdf.cell(0, 12, ar("تقرير حالات التناقض — مراجعة فورية مطلوبة"), align="C", new_x="LMARGIN", new_y="NEXT")

    set_font(10)
    pdf.set_text_color(200, 200, 200)
    now_str = __import__('datetime').datetime.now().strftime('%d-%m-%Y')
    pdf.cell(0, 7, ar(f"تاريخ الإنشاء: {now_str}  |  عدد حالات التناقض: {len(rows)}"), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(12)

    # 2. BOX ALERTE ROSE CENTRÉE
    pdf.set_fill_color(252, 235, 235)
    pdf.rect(10, pdf.get_y(), 190, 14, "F")
    set_font(12, bold=True)
    pdf.set_text_color(163, 45, 45)  # Rouge alerte
    pdf.set_y(pdf.get_y() + 2)
    pdf.cell(0, 10, ar(f"حالات التناقض: {len(rows)}"), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(12)

    # 3. TABLEAU (HAUTE STABILITÉ)
    col_w = [8, 42, 42, 12, 18, 24, 24, 20]  # Total 190mm
    hdrs  = ["#", ar("القاضي"), ar("المحكمة"), ar("النقاط"), ar("الحالة"), ar("التنبؤ"), ar("النسق"), ar("الشعور")]

    # En-tête du tableau
    set_font(8, bold=True)
    pdf.set_text_color(255, 255, 255)
    pdf.set_fill_color(26, 58, 92)
    pdf.set_x(10)
    for i, h in enumerate(hdrs):
        pdf.cell(col_w[i], 8, h, border=1, align="C", fill=True)
    pdf.ln()

    # Données du tableau
    set_font(8)
    for i, row_data in enumerate(rows):
        vals = [
            str(i + 1),
            ar(row_data.get("nom_complet", "")),
            ar(row_data.get("tribunal", "")),
            str(row_data.get("score_total", "")),
            ar(row_data.get("coherence_statut", "")),
            ar(row_data.get("prediction_finale", "")),
            ar(row_data.get("nasaq_type", "")),
            ar(row_data.get("sentiment_label", "")),
        ]

        pdf.set_x(10)
        pdf.set_fill_color(252, 235, 235) if i % 2 == 0 else pdf.set_fill_color(255, 255, 255)

        for idx, v in enumerate(vals):
            align = "C"
            if idx in [1, 2]: align = "R"  # Nom et Tribunal sont à droite
            if idx == 4:
                pdf.set_text_color(163, 45, 45)
            else:
                pdf.set_text_color(30, 30, 30)
            pdf.cell(col_w[idx], 8, v, border="B", align=align, fill=True)
        pdf.ln()

    # fpdf2: pdf.output() returns bytes directly
    pdf_bytes = pdf.output()
    mem = io.BytesIO(pdf_bytes)
    resp = make_response(mem.getvalue())
    resp.headers['Content-Type'] = 'application/pdf'
    resp.headers['Content-Disposition'] = 'attachment; filename=rapport_cspj.pdf'
    return resp

@app.route("/api/juges", methods=["GET"])
@jwt_required()
def get_juges():
    rows = fetch_all("SELECT * FROM dbo.Juges WHERE actif=1 ORDER BY juge_id")
    return jsonify(rows)


@app.route("/api/train", methods=["POST"])
@jwt_required()
def train_models():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "غير مصرح"}), 403
    rows = load_rapports(2024)
    if not rows:
        return jsonify({"error": "لا توجد بيانات"}), 400
    for r in rows:
        if not r.get("coherence_statut"):
            r.update(run_nlp(r["score_total"], r["note_obtenue"],
                             r["points_evolution"], r["description_evaluation"]))
    ok = ml_train(rows)
    return jsonify({"status": "success" if ok else "error",
                    "n_samples": len(rows)})

@app.route("/api/health", methods=["GET"])
def health():
    try:
        from database import fetch_one
        db_check = fetch_one("SELECT @@VERSION as version")
        return jsonify({
            "status": "connected",
            "db_version": db_check["version"][:50] + "...",
            "models": ["random_forest", "isolation_forest", "kmeans", "tfidf_nlp"],
            "message": "Connection SSMS -> app.py OK !"
        })
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000, host="0.0.0.0")