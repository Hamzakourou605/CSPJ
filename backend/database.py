import pyodbc

def get_db():
    server = "DESKTOP-V2EMDL2\\SQLEXPRESS"  # nom du serveur
    user = "sa"                              # nom d'utilisateur SQL
    password = "hamza123"                    # mot de passe
    database = "cspj"                        # nom de la base de données
    
      
    conn_str = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={user};"
        f"PWD={password};"
        "TrustServerCertificate=yes;"
    )

    return pyodbc.connect(conn_str)





def fetch_all(query, params=None):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(query, params or [])
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def fetch_one(query, params=None):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(query, params or [])
        cols = [c[0] for c in cur.description]
        row = cur.fetchone()
        return dict(zip(cols, row)) if row else None
    finally:
        conn.close()


def execute(query, params=None):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(query, params or [])
        conn.commit()
    finally:
        conn.close()


def load_rapports(annee=2024):
    """
    Charge tous les rapports de l'année en évitant les doublons:
    - ROW_NUMBER() PARTITION BY rapport_id garantit qu'on ne prend
      qu'UNE SEULE ligne AnalyseIA par rapport (la plus récente).
    """
    res = fetch_all("""
        SELECT
            r.rapport_id, j.juge_id, j.nom_complet, j.role,
            j.tribunal, j.grade, j.points_evolution,
            r.annee_evaluation, r.score_total, r.score_efficacite,
            r.score_integrite, r.score_conduite, r.note_obtenue,
            r.description_evaluation,
            a.sentiment_label, a.sentiment_score, a.tfidf_top_words,
            a.coherence_statut, a.coherence_pct,
            a.nasaq_type, a.R_value, a.R_prime_value, a.M_value,
            a.rf_prediction, a.rf_confidence,
            a.cluster_id, a.cluster_label,
            a.anomalie, a.anomalie_score,
            a.prediction_finale, a.verdict_texte
        FROM dbo.Rapports r
        INNER JOIN dbo.Juges j ON r.juge_id = j.juge_id
        LEFT JOIN (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY rapport_id ORDER BY analyse_le DESC) AS rn
            FROM dbo.AnalyseIA
        ) a ON r.rapport_id = a.rapport_id AND a.rn = 1
        WHERE r.annee_evaluation = ?
        ORDER BY r.rapport_id
    """, [annee])
    print(f"[DB] load_rapports({annee}): {len(res)} lignes trouvées")
    return res


def save_analyse(rapport_id, juge_id, annee, res):
    conn = get_db()
    try:
        cur = conn.cursor()
        # FIX: rapport_id doit être dans une liste/tuple pour pyodbc
        cur.execute("DELETE FROM dbo.AnalyseIA WHERE rapport_id=?", [rapport_id])
        cur.execute("""
            INSERT INTO dbo.AnalyseIA
              (rapport_id, juge_id, annee_evaluation, analyse_le,
               sentiment_label, sentiment_score, tfidf_top_words,
               coherence_statut, coherence_pct,
               nasaq_type, R_value, R_prime_value, M_value,
               rf_prediction, rf_confidence,
               cluster_id, cluster_label,
               anomalie, anomalie_score,
               prediction_finale, verdict_texte)
            VALUES (?,?,?,GETDATE(),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
            [
                rapport_id, juge_id, annee,
                res.get("sentiment_label", "محايد"),
                res.get("sentiment_score", 0.5),
                res.get("tfidf_top_words", ""),
                res.get("coherence_statut", "متسق"),
                res.get("coherence_pct", 100.0),
                res.get("nasaq_type", "الأقدمية"),
                res.get("R_value", 0.0),
                res.get("R_prime_value", 0.0),
                res.get("M_value", 0.0),
                res.get("rf_prediction", ""),
                res.get("rf_confidence", 0.0),
                res.get("cluster_id", 0),
                res.get("cluster_label", ""),
                1 if res.get("anomalie") else 0,
                res.get("anomalie_score", 0.0),
                res.get("prediction_finale", "متسق"),
                res.get("verdict_texte", "")
            ]
        )
        conn.commit()
    except Exception as e:
        print(f"[DB] save_analyse error: {e}")
    finally:
        conn.close()


def save_historique(user_id, body, res):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO dbo.AnalyseHistorique
              (user_id, score_total, note_obtenue, points_evolution,
               description, sentiment_label, coherence_statut,
               nasaq_type, prediction_finale, rf_prediction,
               rf_confidence, cluster_id, cluster_label,
               anomalie, anomalie_score, coherence_pct)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, [
            user_id, body["score_total"], body["note_obtenue"],
            body["points_evolution"], body["description_evaluation"],
            res["sentiment_label"], res["coherence_statut"],
            res["nasaq_type"], res["prediction_finale"],
            res.get("rf_prediction"), res.get("rf_confidence"),
            res.get("cluster_id"), res.get("cluster_label"),
            1 if res.get("anomalie") else 0, res.get("anomalie_score"),
            res.get("coherence_pct")
        ])
        conn.commit()
    except Exception as e:
        print(f"[DB] save_historique error: {e}")
    finally:
        conn.close()


def save_feedback(rapport_id, verdict_manuel):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE dbo.AnalyseIA
            SET verdict_texte = ? + N' (تصحيح يدوي: ' + ? + ')'
            WHERE rapport_id = ?
        """, verdict_manuel, verdict_manuel, rapport_id)
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB] save_feedback error: {e}")
        return False
    finally:
        conn.close()


def get_stats(annee=2024):
    # Compter TOUS les juges actifs (indépendamment des rapports)
    total = fetch_one("SELECT COUNT(*) AS total_juges FROM dbo.Juges WHERE actif=1", [])
    total_juges = total["total_juges"] if total else 0

    # Statistiques basées sur les rapports de l'année
    stats = fetch_one("""
        SELECT
            COUNT(DISTINCT r.rapport_id) AS nb_rapports,
            ROUND(AVG(CAST(r.score_total AS FLOAT)),1)                  AS moy_score,
            ROUND(AVG(CAST(r.score_efficacite AS FLOAT)),1)             AS moy_efficacite,
            ROUND(AVG(CAST(r.score_integrite AS FLOAT)),1)              AS moy_integrite,
            ROUND(AVG(CAST(r.score_conduite AS FLOAT)),1)               AS moy_conduite,
            ISNULL(MAX(r.score_total), 0)                              AS max_score,
            ISNULL(MIN(r.score_total), 0)                              AS min_score,
            ISNULL(SUM(CASE WHEN a.coherence_statut=N'تناقض' THEN 1 ELSE 0 END), 0) AS nb_incoherents,
            ISNULL(SUM(CASE WHEN a.coherence_statut=N'شك'    THEN 1 ELSE 0 END), 0) AS nb_doute,
            ISNULL(SUM(CASE WHEN a.coherence_statut=N'متسق'  THEN 1 ELSE 0 END), 0) AS nb_coherents,
            ISNULL(SUM(CASE WHEN a.nasaq_type=N'السريع'      THEN 1 ELSE 0 END), 0) AS nb_sari3,
            ISNULL(SUM(CASE WHEN a.nasaq_type=N'المتوسط'     THEN 1 ELSE 0 END), 0) AS nb_mutawasit,
            ISNULL(SUM(CASE WHEN a.nasaq_type=N'الأقدمية'    THEN 1 ELSE 0 END), 0) AS nb_aqdamiya,
            ISNULL(SUM(CASE WHEN a.sentiment_label=N'إيجابي' THEN 1 ELSE 0 END), 0) AS nb_positif,
            ISNULL(SUM(CASE WHEN a.sentiment_label=N'سلبي'   THEN 1 ELSE 0 END), 0) AS nb_negatif,
            ISNULL(SUM(CASE WHEN a.sentiment_label=N'محايد'  THEN 1 ELSE 0 END), 0) AS nb_neutre,
            ISNULL(SUM(CASE WHEN a.anomalie=1                THEN 1 ELSE 0 END), 0) AS nb_anomalies,
            ISNULL(SUM(CASE WHEN a.prediction_finale=N'مراجعة مطلوبة' THEN 1 ELSE 0 END), 0) AS nb_revision
        FROM dbo.Rapports r
        INNER JOIN dbo.Juges j ON r.juge_id = j.juge_id
        LEFT JOIN dbo.AnalyseIA a ON r.rapport_id = a.rapport_id
        WHERE r.annee_evaluation = ?
    """, [annee])

    if stats:
        stats["total_juges"] = total_juges
        # Assurer que tous les champs numériques sont des nombres
        numeric_fields = ['nb_rapports', 'moy_score', 'moy_efficacite', 'moy_integrite', 'moy_conduite', 
                         'max_score', 'min_score', 'nb_incoherents', 'nb_doute', 'nb_coherents',
                         'nb_sari3', 'nb_mutawasit', 'nb_aqdamiya', 'nb_positif', 'nb_negatif',
                         'nb_neutre', 'nb_anomalies', 'nb_revision']
        for field in numeric_fields:
            if field not in stats or stats[field] is None:
                stats[field] = 0
        
        print(f"[DB] get_stats({annee}): Reports={stats['nb_rapports']}, Incoherents={stats['nb_incoherents']}, Doubt={stats['nb_doute']}, Coherents={stats['nb_coherents']}, Total juges={total_juges}")
        print(f"[DB] Sentiments: Positif={stats['nb_positif']}, Negatif={stats['nb_negatif']}, Neutre={stats['nb_neutre']}")
        return stats
    else:
        # Retourner un dict avec des zéros si aucune stat n'est trouvée
        return {
            "total_juges": total_juges,
            "nb_rapports": 0, "moy_score": 0, "moy_efficacite": 0, "moy_integrite": 0, "moy_conduite": 0,
            "max_score": 0, "min_score": 0, "nb_incoherents": 0, "nb_doute": 0, "nb_coherents": 0,
            "nb_sari3": 0, "nb_mutawasit": 0, "nb_aqdamiya": 0, "nb_positif": 0, "nb_negatif": 0,
            "nb_neutre": 0, "nb_anomalies": 0, "nb_revision": 0
        }


def verify_user(username, password):
    """
    Vérifie les informations d'identification d'un utilisateur dans la table dbo.USERS.
    """
    print(f"[DEBUG] Tentative login: '{username}' / '{password}'")
    # On utilise LTRIM et RTRIM pour ignorer les espaces superflus dans SQL Server
    res = fetch_one("""
        SELECT nom, mdp
        FROM dbo.USERS
        WHERE LTRIM(RTRIM(nom)) = ? AND LTRIM(RTRIM(mdp)) = ?
    """, [username, password])
    print(f"[DEBUG] Résultat DB: {res}")
    return res


login = fetch_all("SELECT * FROM dbo.USERS")
print("Login :", login[:2])  


# juges = fetch_all("SELECT * FROM dbo.Juges")
# print("Juges :", juges[:])


# rapports = fetch_all("SELECT * FROM dbo.Rapports")
# print("Rapports :", rapports[:])



# data = load_rapports(2024)
# print("Résultat load_rapports :", data[:2])


# stats = get_stats(2024)
# print(stats)

