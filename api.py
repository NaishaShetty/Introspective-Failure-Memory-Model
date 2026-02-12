from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import numpy as np
import random
import asyncio
import json
import os
from typing import Dict, List
from collections import Counter
from pathlib import Path

from synthetic_failure_dataset import generate_sample, generate_dataset, REGIMES
from failure_memory import FailureMemory
from failure_embedding import FailureEmbedder

app = FastAPI(title="IFM Core API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Initialize the IFM Pipeline on Startup ───
print("[IFM] Initializing pipeline...")

N_SAMPLES = 10_000
data = generate_dataset(N_SAMPLES)
X_all = data["X"]
y_all = data["y"]
regimes_all = data["regime"]

from sklearn.linear_model import LogisticRegression
TRAIN_SPLIT = int(0.5 * N_SAMPLES)
X_train, X_test = X_all[:TRAIN_SPLIT], X_all[TRAIN_SPLIT:]
y_train, y_test = y_all[:TRAIN_SPLIT], y_all[TRAIN_SPLIT:]

model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

probs_test = model.predict_proba(X_test)[:, 1]
preds_test = (probs_test > 0.5).astype(int)
confidence_test = np.abs(probs_test - 0.5) * 2

CONF_THRESHOLD = 0.6
failures = []
for i in range(len(X_test)):
    if preds_test[i] != y_test[i] and confidence_test[i] >= CONF_THRESHOLD:
        failures.append({
            "t": int(data["t"][TRAIN_SPLIT + i]),
            "x": X_test[i],
            "confidence": float(confidence_test[i]),
            "true_y": int(y_test[i]),
            "pred_y": int(preds_test[i]),
            "regime": int(regimes_all[TRAIN_SPLIT + i]),
        })

embedder = FailureEmbedder(n_components=2)
embedder.fit(X_train)

failure_embeddings = []
for f in failures:
    emb = embedder.embed(f["x"], f["confidence"])
    failure_embeddings.append(emb)
    f["embedding"] = emb.tolist()

failure_embeddings = np.array(failure_embeddings)

memory = FailureMemory(n_clusters=3, window=500)
memory.fit(failure_embeddings)

for f in failures:
    cluster_id = memory.assign(np.array(f["embedding"]), f["t"])
    f["cluster_id"] = cluster_id

print(f"[IFM] Pipeline ready. {len(failures)} failures logged across {len(REGIMES)} regimes.")

# ─── Simulation State ───
simulation_t = 0

# ─── API Endpoints (all under /api/) ───

@app.get("/api/connect")
def connect_engine():
    regime_counts = Counter([f["regime"] for f in failures])
    cluster_counts = Counter([f["cluster_id"] for f in failures])
    return {
        "status": "connected",
        "model_type": "LogisticRegression",
        "total_failures": len(failures),
        "regimes": {REGIMES[r].name: c for r, c in regime_counts.items()},
        "clusters": dict(cluster_counts),
        "dataset_size": N_SAMPLES,
    }

@app.get("/api/stream")
def get_stream_sample():
    global simulation_t
    simulation_t += 1
    sample = generate_sample(simulation_t)
    x = sample["x"].reshape(1, -1)
    prob = model.predict_proba(x)[0][1]
    pred = int(prob > 0.5)
    conf = float(np.abs(prob - 0.5) * 2)
    is_failure = (pred != sample["y"]) and (conf >= CONF_THRESHOLD)
    fail_prob = 1.0 - conf if is_failure else (1.0 - conf) * 0.3
    return {
        "t": simulation_t,
        "regime_id": sample["regime"],
        "regime_name": REGIMES[sample["regime"]].name,
        "failure_probability": round(fail_prob, 4),
        "confidence": round(conf * 100, 1),
        "prediction": pred,
        "true_label": sample["y"],
        "is_failure": is_failure,
        "memory_saturation": min(100, 40 + int(simulation_t * 0.05)),
    }

@app.get("/api/failures")
def get_failures():
    regime_breakdown = Counter([f["regime"] for f in failures])
    cluster_breakdown = Counter([f["cluster_id"] for f in failures])
    recent = failures[-20:]
    serializable = []
    for f in recent:
        serializable.append({
            "t": f["t"],
            "confidence": round(f["confidence"], 3),
            "true_y": f["true_y"],
            "pred_y": f["pred_y"],
            "regime": f["regime"],
            "regime_name": REGIMES[f["regime"]].name,
            "cluster_id": f["cluster_id"],
        })
    return {
        "total_failures": len(failures),
        "regime_breakdown": {REGIMES[r].name: c for r, c in regime_breakdown.items()},
        "cluster_breakdown": dict(cluster_breakdown),
        "recent_failures": serializable,
    }

@app.get("/api/regimes")
def get_regimes():
    return {str(id): r.name for id, r in REGIMES.items()}

@app.get("/api/risk-coverage")
def get_risk_coverage():
    confidences = np.abs(probs_test - 0.5) * 2
    errors = (preds_test != y_test).astype(float)
    sorted_indices = np.argsort(-confidences)
    sorted_errors = errors[sorted_indices]
    coverages = []
    risks = []
    for i in range(1, len(sorted_errors) + 1, max(1, len(sorted_errors) // 50)):
        cov = i / len(sorted_errors)
        risk = float(np.mean(sorted_errors[:i]))
        coverages.append(round(cov, 4))
        risks.append(round(risk, 4))
    return {"coverages": coverages, "risks": risks}

# ─── WebSocket ───

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    global simulation_t
    try:
        while True:
            simulation_t += 1
            sample = generate_sample(simulation_t)
            x = sample["x"].reshape(1, -1)
            prob = model.predict_proba(x)[0][1]
            pred = int(prob > 0.5)
            conf = float(np.abs(prob - 0.5) * 2)
            is_failure = (pred != sample["y"]) and (conf >= CONF_THRESHOLD)
            fail_prob = 1.0 - conf if is_failure else (1.0 - conf) * 0.3
            await websocket.send_json({
                "t": simulation_t,
                "regime_id": sample["regime"],
                "regime_name": REGIMES[sample["regime"]].name,
                "failure_probability": round(fail_prob, 4),
                "confidence": round(conf * 100, 1),
                "prediction": pred,
                "true_label": sample["y"],
                "is_failure": is_failure,
                "memory_saturation": min(100, 40 + int(simulation_t * 0.05)),
            })
            await asyncio.sleep(0.2)
    except WebSocketDisconnect:
        print("[WS] Client disconnected")

# ─── Serve React Frontend (MUST BE LAST) ───
# This serves the built React app from frontend-v2/dist
FRONTEND_DIR = Path(__file__).parent / "frontend-v2" / "dist"

if FRONTEND_DIR.exists():
    # Serve static assets (JS, CSS, images) under /assets/
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="static-assets")

    # Catch-all: serve index.html for any non-API route (SPA routing)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # If a specific file exists in dist, serve it
        file_path = FRONTEND_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # Otherwise serve index.html (SPA catch-all)
        return FileResponse(str(FRONTEND_DIR / "index.html"))
else:
    @app.get("/")
    def no_frontend():
        return {
            "status": "IFM Core Active",
            "version": "3.0",
            "message": "Frontend not built. Run 'cd frontend-v2 && npm install && npm run build' first.",
            "failures_logged": len(failures)
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
