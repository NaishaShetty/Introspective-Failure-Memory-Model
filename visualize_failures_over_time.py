import numpy as np
import matplotlib.pyplot as plt
from synthetic_failure_dataset import generate_dataset, REGIMES
from sklearn.linear_model import LogisticRegression

# ----------------------------
# Config
# ----------------------------

N_SAMPLES = 50_000
TRAIN_SPLIT = 0.5
CONF_THRESHOLD = 0.6

# ----------------------------
# Load data
# ----------------------------

data = generate_dataset(N_SAMPLES)

X = data["X"]
y = data["y"]
t = data["t"]
regime = data["regime"]

split = int(TRAIN_SPLIT * N_SAMPLES)

X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]
t_test = t[split:]
regime_test = regime[split:]

# ----------------------------
# Train base model
# ----------------------------

model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

# ----------------------------
# Inference
# ----------------------------

probs = model.predict_proba(X_test)[:, 1]
preds = (probs > 0.5).astype(int)
confidence = np.abs(probs - 0.5) * 2
errors = (preds != y_test).astype(int)

# ----------------------------
# Plot
# ----------------------------

plt.figure(figsize=(14, 6))

plt.plot(t_test, confidence, label="Confidence", alpha=0.6)
plt.plot(t_test, errors, label="Error", alpha=0.4)

# Mark confident failures
fail_idx = np.where((errors == 1) & (confidence >= CONF_THRESHOLD))[0]
plt.scatter(
    t_test[fail_idx],
    confidence[fail_idx],
    color="red",
    label="Confident Failures",
    s=10,
)

# Regime boundaries
for i in range(1, len(t_test)):
    if regime_test[i] != regime_test[i - 1]:
        plt.axvline(t_test[i], color="gray", alpha=0.2)

plt.xlabel("Time")
plt.ylabel("Value")
plt.title("Confidence, Error, and Confident Failures Over Time")
plt.legend()
plt.tight_layout()
plt.show()
