import os
import sys
import pickle
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal

# Add current dir and parent to sys.path so modules and models are importable
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from training.model import NaiveBayesTextClassifier

app = FastAPI(title="SafeVoice ML Inference Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "inference", "model.pkl")

_cached_mtime = 0
_cached_model = None

def get_model():
    global _cached_mtime, _cached_model
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Train the model first.")
    current_mtime = os.path.getmtime(MODEL_PATH)
    if _cached_model is None or current_mtime != _cached_mtime:
        with open(MODEL_PATH, "rb") as f:
            _cached_model = pickle.load(f)
        _cached_mtime = current_mtime
    return _cached_model

class PredictRequest(BaseModel):
    text: str

class PredictResponse(BaseModel):
    label: str
    confidence: float
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]

RISK_MAP = {
    "NORMAL": "LOW",
    "HARASSMENT": "MEDIUM",
    "THREAT": "HIGH",
    "ASSAULT": "HIGH",
    "DISTRESS": "HIGH",
    "EMERGENCY": "CRITICAL",
}

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "SafeVoice ML Backend",
        "docs": "/docs",
        "message": "SafeVoice ML threat detection inference service is active."
    }

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")
    model = get_model()
    label, confidence = model.predict_proba(req.text)
    risk = RISK_MAP.get(label.upper(), "LOW")
    return PredictResponse(label=label, confidence=confidence, risk_level=risk)
