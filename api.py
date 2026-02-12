from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import random
from typing import Dict, List
import time

# Import existing logic from the project
from synthetic_failure_dataset import generate_sample, REGIMES

app = FastAPI(title="IFM Core API")

# Enable CORS for React frontend (port 5173 or 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, specify the exact origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global simulation state
simulation_t = 0

@app.get("/")
def read_root():
    return {"status": "IFM Core Active", "version": "2.0"}

@app.get("/api/stream")
def get_stream_sample():
    """
    Simulates a live inference stream sample for the frontend.
    """
    global simulation_t
    simulation_t += 1
    
    sample = generate_sample(simulation_t)
    
    # Simulate a "Failure Probability" based on regime
    # Regime 0: Clean -> Low failure
    # Regime 4: OOD -> High failure
    base_fail_prob = {
        0: 0.05,
        1: 0.45,
        2: 0.35,
        3: 0.25,
        4: 0.65
    }.get(sample["regime"], 0.1)
    
    # Add some noise to probabilities
    fail_prob = min(max(base_fail_prob + random.uniform(-0.1, 0.15), 0), 1)
    confidence = 1.0 - (fail_prob * 0.8) # Simply confidence metric

    return {
        "t": simulation_t,
        "regime_id": sample["regime"],
        "regime_name": REGIMES[sample["regime"]].name,
        "failure_probability": fail_prob,
        "confidence": confidence * 100,
        "memory_saturation": 60 + (simulation_t % 40) # Simulated growth
    }

@app.get("/api/regimes")
def get_regimes():
    return {id: r.name for id, r in REGIMES.items()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
