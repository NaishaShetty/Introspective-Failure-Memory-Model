import numpy as np
from dataclasses import dataclass
from typing import Tuple, Dict

# ----------------------------
# Configuration
# ----------------------------

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

N_FEATURES = 5
N_CONTEXT = 2
N_SAMPLES = 50_000

REGIME_LENGTH = 1_000  # how long each regime lasts
CONFIDENCE_NOISE = 0.3

# ----------------------------
# Regime Definition
# ----------------------------

@dataclass
class Regime:
    id: int
    name: str
    description: str

REGIMES = {
    0: Regime(0, "clean_linear", "Clean linear decision boundary"),
    1: Regime(1, "flipped_boundary", "Decision boundary flips"),
    2: Regime(2, "high_noise", "Labels corrupted by noise"),
    3: Regime(3, "context_only", "Label depends only on context"),
    4: Regime(4, "ood_extreme", "Out-of-distribution inputs"),
}

# ----------------------------
# Ground-truth parameters
# ----------------------------

TRUE_W = np.random.randn(N_FEATURES)
CONTEXT_W = np.random.randn(N_CONTEXT)

# ----------------------------
# Regime scheduler
# ----------------------------

def get_regime(t: int) -> int:
    """
    Cycles regimes deterministically.
    This makes failures repeatable.
    """
    regime_ids = list(REGIMES.keys())
    idx = (t // REGIME_LENGTH) % len(regime_ids)
    return regime_ids[idx]

# ----------------------------
# Data generation
# ----------------------------

def generate_sample(t: int) -> Dict:
    regime = get_regime(t)

    # Base features (model sees these)
    x = np.random.randn(N_FEATURES)

    # Context features (model does NOT see these initially)
    context = np.random.randn(N_CONTEXT)

    # Modify input distribution for OOD regime
    if regime == 4:
        x = x * 4.0  # extreme values

    # Linear score
    score = np.dot(TRUE_W, x)

    # Regime-specific label logic
    if regime == 0:
        y = score > 0

    elif regime == 1:
        y = score < 0  # flipped boundary

    elif regime == 2:
        noise = np.random.randn() * 2.0
        y = (score + noise) > 0

    elif regime == 3:
        context_score = np.dot(CONTEXT_W, context)
        y = context_score > 0

    elif regime == 4:
        y = score > 0

    else:
        raise ValueError("Unknown regime")

    return {
        "t": t,
        "x": x.astype(np.float32),
        "context": context.astype(np.float32),
        "y": int(y),
        "regime": regime,
    }

# ----------------------------
# Dataset generation
# ----------------------------

def generate_dataset(n_samples: int) -> Dict[str, np.ndarray]:
    X = []
    C = []
    Y = []
    R = []
    T = []

    for t in range(n_samples):
        sample = generate_sample(t)
        X.append(sample["x"])
        C.append(sample["context"])
        Y.append(sample["y"])
        R.append(sample["regime"])
        T.append(sample["t"])

    return {
        "X": np.stack(X),
        "context": np.stack(C),
        "y": np.array(Y),
        "regime": np.array(R),
        "t": np.array(T),
    }

# ----------------------------
# Sanity check
# ----------------------------

if __name__ == "__main__":
    data = generate_dataset(N_SAMPLES)

    print("Dataset generated")
    print("X shape:", data["X"].shape)
    print("Context shape:", data["context"].shape)

    # Regime distribution
    unique, counts = np.unique(data["regime"], return_counts=True)
    print("\nRegime distribution:")
    for r, c in zip(unique, counts):
        print(f"Regime {r} ({REGIMES[r].name}): {c}")
