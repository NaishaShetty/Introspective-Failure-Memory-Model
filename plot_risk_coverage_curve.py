import numpy as np
import matplotlib.pyplot as plt
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

EMA_ALPHA = 0.05
PERCENTILES = np.linspace(0.05, 0.95, 19)

np.random.seed(42)

# ============================================================
# DATA
# ============================================================

data = generate_dataset(N_SAMPLES)

X = data["X"]
y = data["y"]
t = data["t"]

split = int(TRAIN_SPLIT * N_SAMPLES)

X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]
t_test = t[split:]

# ============================================================
# PRIMARY MODEL
# ============================================================

model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

probs = model.predict_proba(X_test)[:, 1]
preds = (probs > 0.5).astype(int)
errors = (preds != y_test).astype(int)

baseline_error = errors.mean()

# ============================================================
# FAILURE MEMORY
# ============================================================

embedder = FailureEmbedder()
embedder.fit(X_train)

memory = FailureMemory(n_clusters=N_CLUSTERS)

probs_train = model.predict_proba(X_train)[:, 1]
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
# ONLINE TEMPORAL DANGER TRACE
# ============================================================

danger_trace = np.zeros(len(X_test))
danger = 0.0

for i in range(len(X_test)):
    emb = embedder.embed(X_test[i], probs[i])

    instant_risk = 0.0
    for k in range(N_CLUSTERS):
        activity = min(
            memory.cluster_activity(k, t_test[i]) / ACTIVITY_CAP,
            1.0
        )
        d2 = np.sum((emb - memory.kmeans.cluster_centers_[k]) ** 2)
        sim = np.exp(-d2 / (SIGMA ** 2))
        instant_risk += sim * activity

    danger = (1 - EMA_ALPHA) * danger + EMA_ALPHA * instant_risk
    danger_trace[i] = danger

    if errors[i] == 1 and abs(probs[i] - 0.5) * 2 >= CONF_THRESHOLD:
        memory.assign(emb, t_test[i])

# ============================================================
# COMPUTE RISK–COVERAGE CURVE
# ============================================================

coverages = []
risks = []

for p in PERCENTILES:
    cutoff = np.percentile(danger_trace, p * 100)
    acted = danger_trace <= cutoff

    coverages.append(acted.mean())
    risks.append(errors[acted].mean())

coverages = np.array(coverages)
risks = np.array(risks)

# ============================================================
# PLOT (POLISHED)
# ============================================================

plt.figure(figsize=(8, 5))

# Main curve
plt.plot(
    coverages,
    risks,
    marker="o",
    linewidth=2.5,
    label="Failure-aware selective prediction"
)

# Baseline
plt.axhline(
    baseline_error,
    linestyle="--",
    linewidth=1.5,
    color="gray",
    label="Baseline (no abstention)"
)

# Safe operating region (≈ 10–20% coverage)
plt.axvspan(
    0.10,
    0.20,
    color="green",
    alpha=0.15,
    label="Safe operating region"
)

# Annotate minimum risk point
min_idx = np.argmin(risks)
plt.scatter(
    coverages[min_idx],
    risks[min_idx],
    color="red",
    zorder=5
)

plt.text(
    coverages[min_idx] + 0.02,
    risks[min_idx],
    f"Min risk\n({risks[min_idx]:.3f})",
    fontsize=9,
    verticalalignment="center"
)

# Labels & styling
plt.xlabel("Coverage (fraction of samples acted on)")
plt.ylabel("Error rate")
plt.title("Risk–Coverage Curve (Temporal Failure Memory)")

plt.legend()
plt.grid(alpha=0.3)

plt.tight_layout()
plt.savefig(
    "risk_coverage_curve.png",
    dpi=200,
    bbox_inches="tight"
)
plt.show()
