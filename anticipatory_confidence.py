import numpy as np
from sklearn.linear_model import LogisticRegression

from synthetic_failure_dataset import generate_dataset
from failure_embedding import FailureEmbedder
from failure_memory import FailureMemory

# ----------------------------
# Config
# ----------------------------

N_SAMPLES = 50_000
TRAIN_SPLIT = 0.5
CONF_THRESHOLD = 0.6

N_CLUSTERS = 3

ALPHA_REACTIVE = 0.7
BETA_ANTICIPATORY = 0.4

ACTIVITY_CAP = 10
SIGMA = 1.0  # similarity width

# ----------------------------
# Load data
# ----------------------------

data = generate_dataset(N_SAMPLES)

X = data["X"]
y = data["y"]
t = data["t"]

split = int(TRAIN_SPLIT * N_SAMPLES)

X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]
t_test = t[split:]

# ----------------------------
# Train base model
# ----------------------------

model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

# ----------------------------
# Setup embedder + memory
# ----------------------------

embedder = FailureEmbedder()
embedder.fit(X_train)

memory = FailureMemory(n_clusters=N_CLUSTERS)

# ----------------------------
# Inference
# ----------------------------

probs = model.predict_proba(X_test)[:, 1]
preds = (probs > 0.5).astype(int)
confidence = np.abs(probs - 0.5) * 2
errors = preds != y_test

# ----------------------------
# Fit memory on known failures (offline)
# ----------------------------

failure_indices = np.where((errors == 1) & (confidence >= CONF_THRESHOLD))[0]

failure_embeddings = np.vstack([
    embedder.embed(X_test[i], probs[i])
    for i in failure_indices
])

memory.fit(failure_embeddings)

# Precompute centroids
centroids = memory.kmeans.cluster_centers_

# ----------------------------
# Sequential evaluation
# ----------------------------

print(
    "\nTime | Conf | Reactive | Anticipatory | Risk | Error"
)

for i in range(len(X_test)):
    p = probs[i]
    c = confidence[i]
    err = int(errors[i])

    # --- Anticipatory risk ---
    emb_now = embedder.embed(X_test[i], p)

    risk = 0.0
    for k in range(N_CLUSTERS):
        activity = memory.cluster_activity(k, t_test[i])
        activity_norm = min(activity / ACTIVITY_CAP, 1.0)

        d2 = np.sum((emb_now - centroids[k]) ** 2)
        similarity = np.exp(-d2 / (SIGMA ** 2))

        risk += similarity * activity_norm

    risk = min(risk, 1.0)

    c_anticipatory = c * (1 - BETA_ANTICIPATORY * risk)

    # --- Reactive update (only if failure) ---
    c_reactive = c
    if err == 1 and c >= CONF_THRESHOLD:
        emb_fail = embedder.embed(X_test[i], p)
        cid = memory.assign(emb_fail, t_test[i])
        activity = memory.cluster_activity(cid, t_test[i])
        activity_norm = min(activity / ACTIVITY_CAP, 1.0)
        c_reactive = c * (1 - ALPHA_REACTIVE * activity_norm)

    # Print only interesting cases
    if risk > 0.2 or err == 1:
        print(
            f"{t_test[i]:5d} | "
            f"{c:.2f} | "
            f"{c_reactive:.2f} | "
            f"{c_anticipatory:.2f} | "
            f"{risk:.2f} | "
            f"{err}"
        )
