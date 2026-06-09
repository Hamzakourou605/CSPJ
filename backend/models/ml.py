import os
import numpy as np
import joblib
from sklearn.preprocessing import StandardScaler

from models.tfidf_vectorisatio import build_features, get_tfidf, set_tfidf
from models.random_forest import train as train_rf, predict as predict_rf
from models.isoation_forst import train as train_iso, predict as predict_iso
from models.k_eans import train as train_kmeans, predict as predict_kmeans


MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models_enregisters')
os.makedirs(MODELS_DIR, exist_ok=True)

scaler = None
is_trained = False

LABEL_MAP = {0: "موثوق", 1: "قيد المراقبة", 2: "مراجعة مطلوبة"}
CLUSTER_MAP = {0: "أداء ضعيف", 1: "أداء متوسط", 2: "أداء ممتاز"}


def build_labels(rows):
    labels = []

    for r in rows:
        status = r.get("coherence_statut", "متسق")

        if status == "تناقض":
            labels.append(2)
        elif status == "شك":
            labels.append(1)
        else:
            labels.append(0)

    return np.array(labels)


def train(rows):
    global scaler, is_trained

    if len(rows) < 3:
        print(" Pas assez de données !!!")
        return False

    X = build_features(rows)
    y = build_labels(rows)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    train_rf(X_scaled, y, os.path.join(MODELS_DIR, "rdmfrst.pkl"))
    train_iso(X_scaled, os.path.join(MODELS_DIR, "isoltfrst.pkl"))
    train_kmeans(X_scaled, os.path.join(MODELS_DIR, "kms.pkl"))

    joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.pkl"))
    joblib.dump(get_tfidf(), os.path.join(MODELS_DIR, "tfidf.pkl"))

    is_trained = True
    print(" Training terminé !!")
    return True


def load_models():
    global scaler, is_trained

    if is_trained:
        return True

    try:
        scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
        tfidf = joblib.load(os.path.join(MODELS_DIR, "tfidf.pkl"))
        set_tfidf(tfidf)

        is_trained = True
        return True
    except:
        return False


def predict_one(row):
    if not load_models():
        return {"error": "model not trained"}

    X = build_features([row])
    X_scaled = scaler.transform(X)

    rf_preds, rf_probas = predict_rf(X_scaled, os.path.join(MODELS_DIR, "rdmfrst.pkl"))
    iso_preds, iso_scores = predict_iso(X_scaled, os.path.join(MODELS_DIR, "isoltfrst.pkl"))
    clusters = predict_kmeans(X_scaled, os.path.join(MODELS_DIR, "kms.pkl"))

    idx = int(rf_preds[0]) 

    return {
        "rf_prediction": LABEL_MAP.get(idx, "موثوق"),
        "rf_confidence": round(float(max(rf_probas[0])), 3),
        "cluster_id": int(clusters[0]),
        "cluster_label": CLUSTER_MAP.get(int(clusters[0]), "—"),
        "anomalie": iso_preds[0] == -1,
        "anomalie_score": round(float(iso_scores[0]), 4),
    }


def predict_batch(rows):
    """
    Prédit les résultats pour plusieurs lignes.
    """
    return [predict_one(r) for r in rows]