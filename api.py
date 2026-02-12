from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import numpy as np
import random
import asyncio
import json
import os
import pandas as pd
import io
from typing import Dict, List, Optional
from collections import Counter, deque
from pathlib import Path

# Project specific imports
from synthetic_failure_dataset import generate_sample, generate_dataset, REGIMES
from failure_memory import FailureMemory
from failure_embedding import FailureEmbedder
from sklearn.linear_model import LogisticRegression

app = FastAPI(title="IFM Enterprise API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global State ───
class GlobalState:
    def __init__(self):
        self.simulation_t = 0
        self.is_paused = False
        self.conf_threshold = 0.6
        self.active_regime_override: Optional[int] = None
        self.failures = []
        self.confusion_matrix = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
        self.total_samples = 0
        self.window_stats = deque(maxlen=100)
        self.specialists = {}
        self.primary_model = None
        self.embedder = None
        self.memory = None
        self.centroids = []
        self.start_t = 0

state = GlobalState()

# ─── Initialization Logic ───
def initialize_system(n_samples=10000):
    print(f"[IFM] Initializing with {n_samples} samples...")
    data = generate_dataset(n_samples)
    X, y, C = data["X"], data["y"], data["context"]
    
    split = int(0.5 * len(X))
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]
    C_train, C_val = C[:split], C[split:]
    
    # 1. Primary Model
    state.primary_model = LogisticRegression(max_iter=1000)
    state.primary_model.fit(X_train, y_train)
    
    # 2. Embeddings
    state.embedder = FailureEmbedder()
    state.embedder.fit(X_train)
    
    # 3. Memory & Clusters
    probs_train = state.primary_model.predict_proba(X_train)[:, 1]
    preds_train = (probs_train > 0.5).astype(int)
    conf_train = np.abs(probs_train - 0.5) * 2
    err_train = (preds_train != y_train).astype(int)
    
    fail_idx = np.where((err_train == 1) & (conf_train >= state.conf_threshold))[0]
    
    # Store initial failures for immediate export/viewing
    for i in fail_idx[:100]:  # Cap at 100 for startup speed
        emb = state.embedder.embed(X_train[i], probs_train[i])
        state.failures.append({
            "t": -int(i), # Initial training failures denoted with negative T
            "x": X_train[i].tolist(),
            "embedding": emb.tolist(),
            "conf": float(conf_train[i]),
            "cluster": 0, # Temporarily 0, will be updated after fit
            "regime": 0   # Background regime
        })

    fail_embeddings = np.vstack([state.embedder.embed(X_train[i], probs_train[i]) for i in fail_idx])
    
    state.memory = FailureMemory(n_clusters=3)
    state.memory.fit(fail_embeddings)
    state.centroids = state.memory.kmeans.cluster_centers_

    # Update cluster IDs for initial failures
    for f in state.failures:
        f["cluster"] = int(state.memory.kmeans.predict(np.array(f["embedding"]).reshape(1,-1))[0])
    
    # 4. Specialists (Feature 3)
    for k in range(3):
        idx_k = [i for i in fail_idx if state.memory.kmeans.predict(state.embedder.embed(X_train[i], probs_train[i]).reshape(1,-1))[0] == k]
        if len(idx_k) > 20:
            Zk = np.hstack([C_train[idx_k], np.vstack([state.embedder.embed(X_train[i], probs_train[i]) for i in idx_k])])
            yk = (y_train[idx_k] != preds_train[idx_k]).astype(int)
            spec_model = LogisticRegression(max_iter=1000, class_weight="balanced")
            spec_model.fit(Zk, yk)
            state.specialists[k] = spec_model

initialize_system()

# ─── Internal Step Logic ───
async def process_step():
    if state.is_paused: return None
    
    state.simulation_t += 1
    # Generate sample with potential regime override
    sample = generate_sample(state.simulation_t, regime_id=state.active_regime_override)
    
    x = sample["x"].reshape(1, -1)
    y_true = sample["y"]
    prob = state.primary_model.predict_proba(x)[0][1]
    pred = int(prob > 0.5)
    conf = float(np.abs(prob - 0.5) * 2)
    err = int(pred != y_true)
    
    # Update Confusion Matrix (Feature 4)
    if pred == 1 and y_true == 1: state.confusion_matrix["tp"] += 1
    elif pred == 1 and y_true == 0: state.confusion_matrix["fp"] += 1
    elif pred == 0 and y_true == 1: state.confusion_matrix["fn"] += 1
    else: state.confusion_matrix["tn"] += 1
    state.total_samples += 1
    state.window_stats.append(1 - err)
    
    # Anticipatory Risk (Feature 2)
    emb = state.embedder.embed(x, prob)
    risk = 0.0
    SIGMA = 1.0
    for k in range(3):
        activity = state.memory.cluster_activity(k, state.simulation_t)
        activity_norm = min(activity / 10, 1.0)
        d2 = np.sum((emb - state.centroids[k]) ** 2)
        sim = np.exp(-d2 / (SIGMA ** 2))
        risk += sim * activity_norm
    risk = min(risk, 1.0)
    
    # Route to specialist (Feature 3)
    c_id = int(state.memory.kmeans.predict(emb.reshape(1,-1))[0])
    used_specialist = False
    final_pred = pred
    if risk > 0.3 and c_id in state.specialists:
        context = sample["context"]
        Z = np.hstack([context, emb]).reshape(1, -1)
        flip = state.specialists[c_id].predict(Z)[0]
        if flip == 1:
            final_pred = 1 - pred
            used_specialist = True
    
    # Reactive Memory Update
    is_failure = (pred != y_true) and (conf >= state.conf_threshold)
    if is_failure:
        cid = state.memory.assign(emb, state.simulation_t)
        state.failures.append({
            "t": state.simulation_t,
            "x": sample["x"].tolist(),
            "embedding": emb.tolist(),
            "conf": conf,
            "cluster": cid,
            "regime": sample["regime"]
        })
        
    return {
        "t": state.simulation_t,
        "regime_name": REGIMES[sample["regime"]].name,
        "prob": round(prob, 4),
        "conf": round(conf * 100, 1),
        "is_failure": is_failure,
        "risk": round(risk, 4),
        "saturation": min(100, 40 + int(len(state.failures) * 0.1)),
        "used_specialist": used_specialist,
        "accuracy_ema": round(np.mean(state.window_stats) * 100, 1) if state.window_stats else 0
    }

# ─── API Endpoints ───

@app.get("/api/stats/summary")
def get_summary():
    acc = (state.confusion_matrix["tp"] + state.confusion_matrix["tn"]) / max(1, state.total_samples)
    return {
        "total_samples": state.total_samples,
        "total_failures": len(state.failures),
        "accuracy": round(acc * 100, 2),
        "confusion": state.confusion_matrix,
        "threshold": state.conf_threshold,
        "paused": state.is_paused,
        "active_override": state.active_regime_override
    }

@app.get("/api/connect")
def connect_engine():
    """Validates that the engine is ready and returns stats for the modal."""
    return {
        "status": "connected",
        "model_type": "LogisticRegression",
        "total_failures": len(state.failures),
        "dataset_size": 10000,
        "regimes": {r.name: 0 for r in REGIMES.values()}
    }

@app.post("/api/control")
async def control_system(req: Request):
    data = await req.json()
    if "paused" in data: state.is_paused = data["paused"]
    if "threshold" in data: state.conf_threshold = data["threshold"]
    if "regime_override" in data: state.active_regime_override = data["regime_override"]
    if "step" in data and data["step"]: 
        old_paused = state.is_paused
        state.is_paused = False
        res = await process_step()
        state.is_paused = old_paused
        return res
    return {"status": "ok"}

@app.get("/api/failures/embeddings")
def get_failure_embeddings():
    # Feature 1: Failure Cluster Heatmap
    return [{
        "x": f["embedding"][0], 
        "y": f["embedding"][1], 
        "cluster": f["cluster"],
        "regime": f["regime"]
    } for f in state.failures[-500:]]

@app.get("/api/specialists")
def get_specialist_stats():
    # Feature 3: Comparison
    return {
        "available_specialists": list(state.specialists.keys()),
        "gain_estimate": "12.4%", # Mocked for UI
        "routing_rate": "15.2%"
    }

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    # Feature 10: Custom Dataset
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    # In a real app we'd re-initialize with this data. For now, simulate acknowledgment.
    return {"status": "Dataset received", "rows": len(df), "features": list(df.columns)}

@app.get("/api/export")
def export_session():
    # Feature 9: CSV Export
    df = pd.DataFrame([{
        "t": f["t"], "conf": f["conf"], "cluster": f["cluster"], "regime": f["regime"]
    } for f in state.failures])
    csv_path = "session_export.csv"
    df.to_csv(csv_path, index=False)
    return FileResponse(csv_path, media_type="text/csv", filename="ifm_failures.csv")

@app.get("/api/risk-coverage")
def get_risk_coverage():
    """Returns risk-coverage curve data."""
    # Since we use a dynamic stream now, we'll provide a static representative curve
    coverages = np.linspace(0.1, 1.0, 50)
    risks = 0.05 + 0.3 * (coverages ** 2)
    return {
        "coverages": [round(float(c), 4) for c in coverages],
        "risks": [round(float(r), 4) for r in risks]
    }

# ─── WebSocket Streaming ───
@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if not state.is_paused:
                res = await process_step()
                if res: await websocket.send_json(res)
            await asyncio.sleep(0.2)
    except WebSocketDisconnect:
        pass

# ─── Static Files ───
FRONTEND_DIR = Path(__file__).parent / "frontend-v2" / "dist"
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="static")
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = FRONTEND_DIR / full_path
        if full_path and file_path.exists(): return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
