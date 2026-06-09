import joblib
from sklearn.cluster import KMeans

model = None


def train(X, path):
    global model
    model = KMeans(n_clusters=3, random_state=42, n_init=10)
    model.fit(X)
    joblib.dump(model, path)


def load(path):
    global model
    if model is None:
        model = joblib.load(path)
    return model


def predict(X, path):
    m = load(path)
    return m.predict(X)