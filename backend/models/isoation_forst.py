import joblib
from sklearn.ensemble import IsolationForest

model = None


def train(X, path):
    global model
    model = IsolationForest(
        n_estimators=100,
        contamination=0.2,
        random_state=42
    )
    model.fit(X)
    joblib.dump(model, path)


def load(path):
    global model
    if model is None:
        model = joblib.load(path)
    return model


def predict(X, path):
    m = load(path)
    preds = m.predict(X)
    scores = m.score_samples(X)
    return preds, scores