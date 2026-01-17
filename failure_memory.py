import numpy as np
from sklearn.cluster import KMeans
from collections import defaultdict, deque

class FailureMemory:
    def __init__(self, n_clusters=3, window=500):
        """
        n_clusters: number of failure types to discover
        window: time window to measure recurrence
        """
        self.n_clusters = n_clusters
        self.window = window

        self.kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        self.fitted = False

        self.memory = defaultdict(lambda: {
            "count": 0,
            "last_seen_t": None,
            "recent_hits": deque(maxlen=window),
        })

    def fit(self, failure_embeddings):
        """
        Offline clustering of failures
        """
        self.kmeans.fit(failure_embeddings)
        self.fitted = True

    def assign(self, embedding, t):
        """
        Assign a failure to a cluster and update memory
        """
        if not self.fitted:
            raise RuntimeError("FailureMemory not fitted")

        cluster_id = int(self.kmeans.predict(embedding.reshape(1, -1))[0])

        cluster = self.memory[cluster_id]
        cluster["count"] += 1
        cluster["last_seen_t"] = t
        cluster["recent_hits"].append(t)

        return cluster_id

    def cluster_activity(self, cluster_id, current_t):
        """
        How active is this failure cluster recently?
        """
        cluster = self.memory[cluster_id]
        return sum(
            1 for t in cluster["recent_hits"]
            if current_t - t <= self.window
        )
