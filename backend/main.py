from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Dict, List

import joblib
import pandas as pd
import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "pipeline.pkl"
HISTORY_PATH = BASE_DIR / "history.csv"
HISTORY_COLUMNS = [
    "fecha",
    "EdadMeses",
    "Hemoglobina",
    "AlturaREN",
    "Diresa",
    "Consejeria",
    "Suplementacion",
    "Sexo",
    "Cred",
    "dx_predicho",
    "probabilidades_json",
]

csv_lock = Lock()


class PredictPayload(BaseModel):
    EdadMeses: int = Field(..., ge=0, le=60)
    Hemoglobina: float = Field(..., ge=0, le=20)
    AlturaREN: float = Field(..., ge=0, le=6000)
    Diresa: str
    Consejeria: int = Field(..., ge=0, le=1)
    Suplementacion: int = Field(..., ge=0, le=1)
    Sexo: str
    Cred: int = Field(..., ge=0, le=1)


app = FastAPI(title="Triaje digital de anemia", version="1.0.0")

allowed_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_history_file() -> None:
    if not HISTORY_PATH.exists():
        df = pd.DataFrame(columns=HISTORY_COLUMNS)
        df.to_csv(HISTORY_PATH, index=False)

def _patch_sklearn_remainder_list() -> None:
    """Asegura compatibilidad al cargar el pipeline con versiones < 1.6 de sklearn."""

    try:
        from sklearn.compose import _column_transformer
    except Exception:
        return

    if hasattr(_column_transformer, "_RemainderColsList"):
        return

    class _RemainderColsList(list):  # type: ignore
        """Compatibilidad mínima para modelos entrenados con sklearn>=1.6."""

    _column_transformer._RemainderColsList = _RemainderColsList  # type: ignore


_patch_sklearn_remainder_list()


try:
    pipeline = joblib.load(MODEL_PATH)
except Exception as exc:  # pragma: no cover - startup failure path
    raise RuntimeError(f"No se pudo cargar el modelo desde {MODEL_PATH}: {exc}") from exc

ensure_history_file()


def calcular_semaforo(dx: str) -> str:
    mapping = {
        "Normal": "\U0001F7E2",  # 🟢
        "Leve": "\U0001F7E1",  # 🟡
        "Moderada": "\U0001F7E0",  # 🟠
        "Severa": "\U0001F534",  # 🔴
    }
    return mapping.get(dx, "\U0001F7E2")


def generar_recomendacion(dx: str) -> str:
    recomendaciones = {
        "Normal": "Continuar con controles regulares y alimentación balanceada.",
        "Leve": "Refuerce alimentación rica en hierro y programe control de hemoglobina en 30 días.",
        "Moderada": "Indique suplementación con hierro y seguimiento cercano en 15 días.",
        "Severa": "Derivar para atención inmediata y manejo hospitalario si corresponde.",
    }
    return recomendaciones.get(dx, "Seguimiento según criterio clínico.")


def guardar_historial(fila: Dict[str, str | int | float]) -> None:
    with csv_lock:
        df = pd.DataFrame([fila])
        df.to_csv(HISTORY_PATH, mode="a", header=not HISTORY_PATH.stat().st_size, index=False)


@app.post("/predict")
async def predict(payload: PredictPayload):
    try:
        X = pd.DataFrame([payload.model_dump()])
        dx_predicho = pipeline.predict(X)[0]
        proba = pipeline.predict_proba(X)[0]
        clases = pipeline.named_steps["model"].classes_
    except Exception as exc:  # pragma: no cover - runtime errors
        raise HTTPException(status_code=500, detail=f"Error al generar predicción: {exc}") from exc

    probabilidades = {str(clase): float(prob) for clase, prob in zip(clases, proba)}

    semaforo = calcular_semaforo(str(dx_predicho))
    recomendacion = generar_recomendacion(str(dx_predicho))

    fila = {
        "fecha": datetime.utcnow().isoformat(),
        **payload.model_dump(),
        "dx_predicho": str(dx_predicho),
        "probabilidades_json": json.dumps(probabilidades, ensure_ascii=False),
    }

    try:
        guardar_historial(fila)
        saved = True
    except Exception as exc:  # pragma: no cover - file write errors
        saved = False
        raise HTTPException(status_code=500, detail=f"No se pudo guardar el historial: {exc}") from exc

    return {
        "dx_predicho": str(dx_predicho),
        "semáforo": semaforo,
        "probabilidades": probabilidades,
        "recomendacion": recomendacion,
        "saved": saved,
    }


@app.get("/history")
async def history(limit: int = Query(200, ge=1)) -> List[Dict]:
    ensure_history_file()
    df = pd.read_csv(HISTORY_PATH)
    if df.empty:
        return []
    if "fecha" in df.columns:
        df = df.sort_values(by="fecha", ascending=False)
    registros = df.head(limit).to_dict(orient="records")
    return registros


@app.get("/")
async def root():
    return {"status": "ok"}
