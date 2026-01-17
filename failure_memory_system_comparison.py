import numpy as np
from sklearn.linear_model import LogisticRegression

from synthetic_failure_dataset import generate_dataset
from failure_embedding import FailureEmbedder
from failure_memory import FailureMemory

# ============================================================
# CONFIG
# ============================================================

N_SAMPLES = 50_000
TRAIN_SPLIT = 0.5
CONF_THRESHOLD = 0.6

N_CLUSTERS = 3
SIGMA = 1.0
ACTIVITY_CAP = 10

TAU_CONF = 0.6
TAU_DANGER = 0.15

np.random.seed(42)

# ============================================================
# DATA
# ============================================================

data = generate_dataset(N_SAMPLES)

X = data["X"]
C = data["context"]
y = data["y"]
t = data["t"]

split = int(TRAIN_SPLIT * N_SAMPLES)

X_train, X_test = X[:split], X[split:]
C_train, C_test = C[:split], C[split:]
y_train, y_test = y[:split], y[split:]
t_test = t[split:]

# ============================================================
# PRIMARY MODEL
# ============================================================

primary = LogisticRegression(max_iter=1000)
primary.fit(X_train, y_train)

probs = primary.predict_proba(X_test)[:, 1]
preds = (probs > 0.5).astype(int)
confidence = np.abs(probs - 0.5) * 2
errors = (preds != y_test).astype(int)

# ============================================================
# FAILURE MEMORY
# ============================================================

embedder = FailureEmbedder()
embedder.fit(X_train)

memory = FailureMemory(n_clusters=N_CLUSTERS)

probs_train = primary.predict_proba(X_train)[:, 1]
preds_train = (probs_train > 0.5).astype(int)
conf_train = np.abs(probs_train - 0.5) * 2
errors_train = (preds_train != y_train).astype(int)

train_fail_idx = np.where(
    (errors_train == 1) & (conf_train >= CONF_THRESHOLD)
)[0]

train_emb = np.vstack([
    embedder.embed(X_train[i], probs_train[i])
    for i in train_fail_idx
])

memory.fit(train_emb)

# ============================================================
# EXPERIMENT 1: NAIVE CORRECTION (LABEL PREDICTOR)
# ============================================================

naive_specialist = LogisticRegression(
    max_iter=1000,
    class_weight="balanced"
)
naive_specialist.fit(C_train[train_fail_idx], y_train[train_fail_idx])

# ============================================================
# EXPERIMENT 2: FAILURE-CONDITIONED CORRECTION
# (with deterministic handling)
# ============================================================

Z_corr = np.hstack([
    C_train[train_fail_idx],
    np.vstack([
        embedder.embed(X_train[i], probs_train[i])
        for i in train_fail_idx
    ])
])

y_corr = (y_train[train_fail_idx] != preds_train[train_fail_idx]).astype(int)
unique = np.unique(y_corr)

if len(unique) == 1:
    corr_specialist = {
        "type": "rule",
        "flip": int(unique[0])
    }
else:
    model = LogisticRegression(
        max_iter=1000,
        class_weight="balanced"
    )
    model.fit(Z_corr, y_corr)
    corr_specialist = {
        "type": "model",
        "model": model
    }

# ============================================================
# EVALUATION
# ============================================================

results = {
    "naive_correction": [],
    "failure_correction": [],
    "abstention": []
}

for i in range(len(X_test)):
    emb = embedder.embed(X_test[i], probs[i])

    # ---- danger score (shared) ----
    danger = 0.0
    for k in range(N_CLUSTERS):
        activity = min(
            memory.cluster_activity(k, t_test[i]) / ACTIVITY_CAP,
            1.0
        )
        d2 = np.sum((emb - memory.kmeans.cluster_centers_[k]) ** 2)
        sim = np.exp(-d2 / (SIGMA ** 2))
        danger += sim * activity

    # ========================================================
    # 1️⃣ NAIVE CORRECTION
    # ========================================================

    if danger > TAU_DANGER:
        p = naive_specialist.predict(C_test[i].reshape(1, -1))[0]
    else:
        p = preds[i]

    results["naive_correction"].append(p)

    # ========================================================
    # 2️⃣ FAILURE-CONDITIONED CORRECTION
    # ========================================================

    if danger > TAU_DANGER:
        if corr_specialist["type"] == "rule":
            flip = corr_specialist["flip"]
        else:
            Z = np.hstack([C_test[i], emb]).reshape(1, -1)
            flip = corr_specialist["model"].predict(Z)[0]

        p = 1 - preds[i] if flip else preds[i]
    else:
        p = preds[i]

    results["failure_correction"].append(p)

    # ========================================================
    # 3️⃣ FAILURE-AWARE ABSTENTION
    # ========================================================

    if (confidence[i] >= TAU_CONF) and (danger < TAU_DANGER):
        p = preds[i]
    else:
        p = -1  # abstain

    results["abstention"].append(p)

    # update memory
    if errors[i] == 1 and confidence[i] >= CONF_THRESHOLD:
        memory.assign(emb, t_test[i])

# ============================================================
# METRICS
# ============================================================

print("\n=== FAILURE MEMORY SYSTEM COMPARISON ===\n")

for name, p in results.items():
    p = np.array(p)

    if name == "abstention":
        mask = p != -1
        err = (p[mask] != y_test[mask]).mean()
        cov = mask.mean()
        print(f"{name:25s} | acted: {cov:6.2%} | error: {err:.4f}")
    else:
        err = (p != y_test).mean()
        print(f"{name:25s} | error: {err:.4f}")

print(f"\nbaseline primary error      : {errors.mean():.4f}")
