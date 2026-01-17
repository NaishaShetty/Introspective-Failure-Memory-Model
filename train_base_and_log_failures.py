import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from synthetic_failure_dataset import generate_dataset, REGIMES

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
context = data["context"]

split = int(TRAIN_SPLIT * N_SAMPLES)

X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

# ----------------------------
# Train base model
# ----------------------------

model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

# ----------------------------
# Evaluate (sanity check)
# ----------------------------

probs = model.predict_proba(X_test)[:, 1]
preds = (probs > 0.5).astype(int)

acc = accuracy_score(y_test, preds)
print(f"Base model accuracy: {acc:.3f}")

# ----------------------------
# Confidence computation
# ----------------------------

confidence = np.abs(probs - 0.5) * 2  # [0, 1]

# ----------------------------
# Failure logging
# ----------------------------

failures = []

for i in range(len(X_test)):
    if preds[i] != y_test[i] and confidence[i] >= CONF_THRESHOLD:
        failures.append({
            "t": t[split + i],
            "x": X_test[i],
            "context": context[split + i],
            "confidence": confidence[i],
            "true_y": y_test[i],
            "pred_y": preds[i],
            "regime": regime[split + i],
        })

print(f"\nConfident failures logged: {len(failures)}")

# ----------------------------
# Regime-wise failure breakdown
# ----------------------------

from collections import Counter

regime_counts = Counter([f["regime"] for f in failures])

print("\nConfident failures by regime:")
for r, count in sorted(regime_counts.items()):
    print(f"Regime {r} ({REGIMES[r].name}): {count}")
