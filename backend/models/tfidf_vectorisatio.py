import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

tfidf_vectorizer = None


def build_features(rows):
    global tfidf_vectorizer

    numeric_features = np.array([[
        float(r.get("score_total", 0)),
        float(r.get("score_efficacite", 0)),
        float(r.get("score_integrite", 0)),
        float(r.get("score_conduite", 0)),
        float(r.get("note_obtenue", 0)),
        float(r.get("coherence_pct", 50)),
        float(r.get("gap", 0.3)),
        float(r.get("sentiment_score", 0.5)),
    ] for r in rows])

    texts = [r.get("description_evaluation", "") or "" for r in rows]

    if tfidf_vectorizer is None:
        tfidf_vectorizer = TfidfVectorizer(max_features=30, analyzer='char_wb', ngram_range=(2, 4))
        text_features = tfidf_vectorizer.fit_transform(texts).toarray()
    else:
        text_features = tfidf_vectorizer.transform(texts).toarray()

    return np.hstack([numeric_features, text_features])


def get_tfidf():
    return tfidf_vectorizer


def set_tfidf(tfidf):
    global tfidf_vectorizer
    tfidf_vectorizer = tfidf