
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import load_rapports
from models.nlp import run_nlp
from models.ml import train as train_ml

def main():
    print("[TRAIN] Chargement des données depuis cspj_db...")
    rows = load_rapports(2024)
    if not rows:
        print("[TRAIN] Aucune donnée. Vérifiez la connexion SQL Server.")
        return

    print(f"[TRAIN] {len(rows)} rapports chargés.")


    enriched = []
    for r in rows:
        if not r.get("coherence_statut"):
            nlp_res = run_nlp(
                r["score_total"], r["note_obtenue"],
                r["points_evolution"], r["description_evaluation"]
            )
            r.update(nlp_res)
        enriched.append(r)

  
    # Le nettoyage et l'enrichissement sont faits ci-dessus.
    # L'entraînement global s'occupe de tous les modèles (RF, ISO, KM, TFIDF).

    print("[TRAIN] Entraînement global ML...")
    ok = train_ml(enriched)


    if ok:
        print("[TRAIN] Modèles sauvegardés dans ./models_enregisters/")
    else:
        print("[TRAIN] Échec de l'entraînement.")


if __name__ == "__main__":
    main()