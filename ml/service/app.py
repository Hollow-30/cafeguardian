"""API binaria autenticada. Ejecutar desde la raíz del repositorio."""

import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass
import hmac
import logging
import os
from pathlib import Path
from time import perf_counter
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.concurrency import run_in_threadpool

from .predictor import FORMATS, MAX_BYTES, PredictionError, Predictor

logger = logging.getLogger("uvicorn.error.cafeguardian")
DEFAULT_CHECKPOINT = Path(__file__).resolve().parents[1] / "models/resnet18_coffee_base.pth"


@dataclass(frozen=True)
class Settings:
    token: str
    checkpoint: Path = DEFAULT_CHECKPOINT
    num_threads: int = 1

    def __post_init__(self):
        if len(self.token) < 32:
            raise ValueError("INFERENCE_SERVICE_TOKEN requiere al menos 32 caracteres")
        if not 1 <= self.num_threads <= 8:
            raise ValueError("INFERENCE_NUM_THREADS debe estar entre 1 y 8")

    @classmethod
    def from_env(cls):
        return cls(token=os.environ.get("INFERENCE_SERVICE_TOKEN", ""),
                   checkpoint=Path(os.environ.get("INFERENCE_CHECKPOINT", DEFAULT_CHECKPOINT)),
                   num_threads=int(os.environ.get("INFERENCE_NUM_THREADS", "1")))


class Classification(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    label: Literal["healthy", "rust"]
    confidence: float = Field(ge=0, le=100, allow_inf_nan=False)
    isDemo: Literal[False]


def create_app(settings=None, predictor_factory=Predictor):
    @asynccontextmanager
    async def lifespan(app):
        config = settings or Settings.from_env()
        app.state.settings = config
        app.state.predictor = await run_in_threadpool(
            predictor_factory, config.checkpoint, config.num_threads)
        yield
        app.state.predictor = None

    api = FastAPI(title="CoffeeGuardian inference", lifespan=lifespan,
                  docs_url=None, redoc_url=None, openapi_url=None)

    @api.middleware("http")
    async def timing(request, call_next):
        start = perf_counter()
        response = await call_next(request)
        elapsed = (perf_counter() - start) * 1000
        response.headers["Server-Timing"] = f"total;dur={elapsed:.2f}"
        response.headers["Cache-Control"] = "no-store"
        logger.info("request status=%d duration_ms=%.2f", response.status_code, elapsed)
        return response

    @api.exception_handler(PredictionError)
    async def prediction_error(request, error):
        return JSONResponse({"error": str(error)}, status_code=error.status)

    @api.get("/healthz")
    async def health():
        return {"ready": api.state.predictor is not None}

    @api.post("/predict", response_model=Classification)
    async def predict(request: Request):
        expected = f"Bearer {api.state.settings.token}".encode("utf-8")
        supplied = request.headers.get("authorization", "").encode("utf-8")
        if not hmac.compare_digest(supplied, expected):
            raise PredictionError(401, "No autorizado.")
        content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
        if content_type not in FORMATS:
            raise PredictionError(415, "Usa JPEG, PNG o WebP.")
        declared = request.headers.get("content-length")
        if declared is not None:
            if not declared.isascii() or not declared.isdigit() or len(declared) > 10:
                raise PredictionError(400, "Longitud de contenido inválida.")
            if int(declared) > MAX_BYTES:
                raise PredictionError(413, "La foto supera el límite de 10 MiB.")
        data = bytearray()
        try:
            async with asyncio.timeout(15):
                async for chunk in request.stream():
                    if len(data) + len(chunk) > MAX_BYTES:
                        raise PredictionError(413, "La foto supera el límite de 10 MiB.")
                    data.extend(chunk)
        except TimeoutError as exc:
            raise PredictionError(408, "Se agotó el tiempo para recibir la foto.") from exc
        if not data:
            raise PredictionError(422, "La foto está vacía.")
        start = perf_counter()
        try:
            result = await run_in_threadpool(api.state.predictor.predict, bytes(data), content_type)
            result = Classification.model_validate(result)
        except PredictionError:
            raise
        except Exception as exc:
            logger.error("inference_failed type=%s", type(exc).__name__)
            raise PredictionError(503, "No se pudo completar el análisis.") from exc
        response = JSONResponse(result.model_dump())
        response.headers["X-Inference-Time-Ms"] = f"{(perf_counter() - start) * 1000:.2f}"
        return response

    return api


app = create_app()
