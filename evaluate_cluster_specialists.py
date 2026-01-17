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
SIGMA = 1.0
ACTIVITY_CAP = 10

TAU_CONF = 0.6
TAU_DANGER = 0.15
EMA_ALPHA = 0.05
DANGER_DECAY = 0.01

np.random.seed(42)

# ----------------------------
# Load data
# ----------------------------

data = generate_dataset(N_SAMPLES)

X = data["X"]
context = data["context"]
y = data["y"]
t = data["t"]

split = int(TRAIN_SPLIT * N_SAMPLES)

X_train, X_test = X[:split], X[split:]
C_train, C_test = context[:split], context[split:]
y_train, y_test = y[:split], y[split:]
t_test = t[split:]

# ----------------------------
# Train primary model
# ----------------------------

primary = LogisticRegression(max_iter=1000)
primary.fit(X_train, y_train)

probs = primary.predict_proba(X_test)[:, 1]
preds = (probs > 0.5).astype(int)
confidence = np.abs(probs - 0.5) * 2
errors = (preds != y_test).astype(int)

# ----------------------------
# Failure embedding + memory
# ----------------------------

embedder = FailureEmbedder()
embedder.fit(X_train)

memory = FailureMemory(n_clusters=N_CLUSTERS)

# ----------------------------
# Initialize failure memory
# ----------------------------

probs_train = primary.predict_proba(X_train)[:, 1]
preds_train = (probs_train > 0.5).astype(int)
conf_train = np.abs(probs_train - 0.5) * 2
errors_train = (preds_train != y_train).astype(int)

train_fail_idx = np.where(
    (errors_train == 1) & (conf_train >= CONF_THRESHOLD)
)[0]

train_embeddings = np.vstack([
    embedder.embed(X_train[i], probs_train[i])
    for i in train_fail_idx
])

memory.fit(train_embeddings)

# ----------------------------
# Train per-cluster specialists
# Target = "should primary be flipped?"
# ----------------------------

specialists = {}

for k in range(N_CLUSTERS):
    idx_k = []

    for i in train_fail_idx:
        emb = embedder.embed(X_train[i], probs_train[i])
        cid = memory.kmeans.predict(emb.reshape(1, -1))[0]
        if cid == k:
            idx_k.append(i)

    if len(idx_k) < 50:
        continue

    Zk = np.hstack([
        C_train[idx_k],
        np.vstack([
            embedder.embed(X_train[i], probs_train[i])
            for i in idx_k
        ])
    ])

    # correction target: 1 = flip, 0 = keep
    yk = (y_train[idx_k] != preds_train[idx_k]).astype(int)
    unique = np.unique(yk)

    if len(unique) == 1:
        # deterministic specialist
        specialists[k] = {
            "type": "rule",
            "flip": int(unique[0])
        }
    else:
        model = LogisticRegression(
            max_iter=1000,
            class_weight="balanced"
        )
        model.fit(Zk, yk)
        specialists[k] = {
            "type": "model",
            "model": model
        }

# ----------------------------
# Online routing + inference
# ----------------------------

danger = np.zeros(N_CLUSTERS)

combined_preds = []
used_route = []   # "primary" or cluster id

for i in range(len(X_test)):
    emb = embedder.embed(X_test[i], probs[i])

    sim = np.zeros(N_CLUSTERS)
    activity = np.zeros(N_CLUSTERS)

    for k in range(N_CLUSTERS):
        activity[k] = min(
            memory.cluster_activity(k, t_test[i]) / ACTIVITY_CAP,
            1.0
        )

        d2 = np.sum((emb - memory.kmeans.cluster_centers_[k]) ** 2)
        sim[k] = np.exp(-d2 / (SIGMA ** 2))

        danger[k] = (1 - DANGER_DECAY) * danger[k] + EMA_ALPHA * activity[k]

    danger_local = np.sum(sim * danger)

    # ---------- Routing ----------
    if (confidence[i] >= TAU_CONF) and (danger_local < TAU_DANGER):
        combined_preds.append(preds[i])
        used_route.append("primary")
    else:
        k_star = np.argmax(sim)

        if k_star in specialists:
            spec = specialists[k_star]

            if spec["type"] == "rule":
                flip = spec["flip"]
            else:
                Z = np.hstack([C_test[i], emb]).reshape(1, -1)
                flip = spec["model"].predict(Z)[0]

            if flip == 1:
                combined_preds.append(1 - preds[i])
            else:
                combined_preds.append(preds[i])

            used_route.append(k_star)
        else:
            combined_preds.append(preds[i])
            used_route.append("primary")

    if errors[i] == 1 and confidence[i] >= CONF_THRESHOLD:
        memory.assign(emb, t_test[i])

combined_preds = np.array(combined_preds)

# ----------------------------
# Results
# ----------------------------

print("\nPER-CLUSTER FAILURE-CORRECTION SYSTEM RESULTS\n")

print(f"Total samples            : {len(X_test)}")

primary_mask = np.array([r == "primary" for r in used_route])
print(f"Primary usage            : {primary_mask.mean():.2%}")

for k in specialists:
    k_mask = np.array([r == k for r in used_route])
    print(f"Specialist {k} usage      : {k_mask.mean():.2%}")

print(f"\nBaseline error (primary) : {errors.mean():.4f}")
print(f"Combined system error    : {(combined_preds != y_test).mean():.4f}")

if primary_mask.any():
    print(
        f"\nPrimary error (used)     : "
        f"{(combined_preds[primary_mask] != y_test[primary_mask]).mean():.4f}"
    )

for k in specialists:
    k_mask = np.array([r == k for r in used_route])
    if k_mask.any():
        print(
            f"Specialist {k} error     : "
            f"{(combined_preds[k_mask] != y_test[k_mask]).mean():.4f}"
        )
