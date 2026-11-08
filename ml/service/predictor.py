"""Carga verificada del modelo y decodificación estricta, sin entrenamiento."""

from io import BytesIO
from pathlib import Path
from threading import Lock
import warnings

from PIL import Image, ImageFile, UnidentifiedImageError
import torch
from torchvision import models, transforms

from ml.src.evaluation import CHECKPOINT_SHA256, validate_checkpoint_metadata, verify_artifact

MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 20_000_000
FORMATS = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}


class PredictionError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def decode_photo(data: bytes, content_type: str):
    if content_type not in FORMATS:
        raise PredictionError(415, "Usa JPEG, PNG o WebP.")
    if not data:
        raise PredictionError(422, "La foto está vacía.")
    if len(data) > MAX_BYTES:
        raise PredictionError(413, "La foto supera el límite de 10 MiB.")
    if ImageFile.LOAD_TRUNCATED_IMAGES:
        raise RuntimeError("La inferencia requiere decodificación estricta")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                if image.format != FORMATS[content_type]:
                    raise PredictionError(415, "El formato real no coincide con el tipo declarado.")
                if image.width * image.height > MAX_PIXELS:
                    raise PredictionError(422, "La imagen supera el límite de 20 millones de píxeles.")
                if getattr(image, "n_frames", 1) != 1:
                    raise PredictionError(422, "Selecciona una imagen sin animación.")
                image.verify()
            with Image.open(BytesIO(data)) as image:
                image.load()
                return image.convert("RGB")
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, EOFError,
            Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise PredictionError(422, "No se pudo leer la imagen. Selecciona otra foto.") from exc


def classification_from_logits(logits):
    if logits.shape != (1, 2) or not torch.isfinite(logits).all():
        raise RuntimeError("El modelo devolvió logits inválidos")
    probabilities = torch.softmax(logits, dim=1)
    index = int(probabilities.argmax(dim=1).item())
    return {"label": ("rust", "healthy")[index],
            "confidence": float(probabilities[0, index].item()) * 100,
            "isDemo": False}


class Predictor:
    def __init__(self, checkpoint_path: Path, num_threads=1):
        verify_artifact(checkpoint_path, CHECKPOINT_SHA256)
        if ImageFile.LOAD_TRUNCATED_IMAGES:
            raise RuntimeError("La inferencia requiere decodificación estricta")
        torch.set_num_threads(num_threads)
        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
        validate_checkpoint_metadata(checkpoint)
        self.model = models.resnet18(weights=None)
        self.model.fc = torch.nn.Linear(self.model.fc.in_features, 2)
        self.model.load_state_dict(checkpoint["model_state_dict"], strict=True)
        self.model.eval()
        # Same preprocessing as CAFG-106 test/validation; no augmentation or EXIF rotation.
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)), transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
        self.lock = Lock()

    def predict(self, data: bytes, content_type: str):
        if not self.lock.acquire(blocking=False):
            raise PredictionError(503, "El servicio está ocupado. Inténtalo de nuevo.")
        try:
            with decode_photo(data, content_type) as image:
                tensor = self.transform(image).unsqueeze(0)
            with torch.inference_mode():
                return classification_from_logits(self.model(tensor))
        finally:
            self.lock.release()
