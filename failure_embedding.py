import numpy as np
from sklearn.decomposition import PCA

class FailureEmbedder:
    def __init__(self, n_components=2):
        self.pca = PCA(n_components=n_components)
        self.fitted = False

    def fit(self, X):
        self.pca.fit(X)
        self.fitted = True

    def embed(self, x, prob):
        if not self.fitted:
            raise RuntimeError("Embedder not fitted")

        x_proj = self.pca.transform(x.reshape(1, -1))[0]

        margin = abs(prob - 0.5)
        confidence = 2 * margin

        return np.array([
            x_proj[0],
            x_proj[1],
            confidence,
            margin,
        ])
