import joblib
from sklearn.ensemble import RandomForestClassifier

model = None


def train(X, y, path):
    global model
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        random_state=42,
        class_weight='balanced'
    )
    model.fit(X, y)
    joblib.dump(model, path)


def load(path):
    global model
    if model is None:
        model = joblib.load(path)
    return model


def predict(X, path):
    m = load(path)
    preds = m.predict(X)
    probas = m.predict_proba(X)
    return preds, probas