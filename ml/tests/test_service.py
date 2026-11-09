"""API, errores de imagen e inferencia CPU con el checkpoint real; sin dataset."""

from io import BytesIO
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from time import perf_counter
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image, ImageFile
import torch
from torchvision.transforms import functional as TF

from ml.service.app import create_app, Settings, DEFAULT_CHECKPOINT
from ml.service.predictor import (
    Predictor, PredictionError, MAX_BYTES, decode_photo, classification_from_logits,
)

TOKEN = "local-test-token-not-a-production-secret"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "image/png"}


def photo(fmt="PNG"):
    output = BytesIO()
    # Synthetic fixture, not evidence of diagnostic accuracy or calibration.
    with Image.new("RGB", (48, 32), (30, 120, 55)) as image:
        image.save(output, format=fmt)
    return output.getvalue()


class ImageTests(unittest.TestCase):
    def test_supported_formats_and_rgb(self):
        for fmt, mime in [("JPEG", "image/jpeg"), ("PNG", "image/png"), ("WEBP", "image/webp")]:
            with self.subTest(fmt=fmt), decode_photo(photo(fmt), mime) as image:
                self.assertEqual(image.mode, "RGB")
                self.assertEqual(image.size, (48, 32))

    def test_empty_fake_truncated_and_mislabeled(self):
        for data, mime, status in [
            (b"", "image/png", 422), (b"not an image", "image/png", 422),
            (photo("JPEG")[:100], "image/jpeg", 422),
            (photo("PNG"), "image/jpeg", 415), (photo(), "text/plain", 415),
            (b"x" * (MAX_BYTES + 1), "image/png", 413),
        ]:
            with self.subTest(mime=mime, size=len(data)):
                with self.assertRaises(PredictionError) as caught:
                    decode_photo(data, mime)
                self.assertEqual(caught.exception.status, status)

    def test_pixel_limit(self):
        with patch("ml.service.predictor.MAX_PIXELS", 10):
            with self.assertRaises(PredictionError) as caught:
                decode_photo(photo(), "image/png")
            self.assertEqual(caught.exception.status, 422)

    def test_animated_image(self):
        output = BytesIO()
        with Image.new("RGB", (8, 8), "green") as first, Image.new("RGB", (8, 8), "red") as second:
            first.save(output, "PNG", save_all=True, append_images=[second], duration=100, loop=0)
        with self.assertRaises(PredictionError):
            decode_photo(output.getvalue(), "image/png")

    def test_never_accepts_tolerant_decoding(self):
        with patch.object(ImageFile, "LOAD_TRUNCATED_IMAGES", True):
            with self.assertRaises(RuntimeError):
                decode_photo(photo(), "image/png")


class LogitTests(unittest.TestCase):
    def test_maps_both_classes_and_converts_to_percentage(self):
        for values, expected in [([3.0, 1.0], "rust"), ([1.0, 3.0], "healthy")]:
            result = classification_from_logits(torch.tensor([values]))
            self.assertEqual(result["label"], expected)
            self.assertAlmostEqual(result["confidence"], 88.0797, places=3)
            self.assertIs(result["isDemo"], False)

    def test_rejects_nonfinite_or_wrong_shape(self):
        for logits in [torch.tensor([[float("nan"), 0]]), torch.tensor([[float("inf"), 0]]),
                       torch.zeros(1, 3), torch.zeros(2, 2)]:
            with self.assertRaises(RuntimeError):
                classification_from_logits(logits)


class FakePredictor:
    def __init__(self, *_):
        self.calls = 0

    def predict(self, data, content_type):
        self.calls += 1
        with decode_photo(data, content_type):
            return {"label": "healthy", "confidence": 88.0, "isDemo": False}


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.api = create_app(Settings(TOKEN), predictor_factory=FakePredictor)
        self.client = TestClient(self.api)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)

    def test_ready_and_contract_with_timings(self):
        self.assertEqual(self.client.get("/healthz").json(), {"ready": True})
        response = self.client.post("/predict", content=photo(), headers=HEADERS)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"label": "healthy", "confidence": 88, "isDemo": False})
        self.assertGreaterEqual(float(response.headers["X-Inference-Time-Ms"]), 0)
        self.assertRegex(response.headers["Server-Timing"], r"total;dur=\d+\.\d+")
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_auth_before_body_and_prediction(self):
        for authorization in [None, "Bearer wrong"]:
            headers = {"Content-Type": "image/png"}
            if authorization:
                headers["Authorization"] = authorization
            response = self.client.post("/predict", content=b"invalid", headers=headers)
            self.assertEqual(response.status_code, 401)
        self.assertEqual(self.api.state.predictor.calls, 0)

    def test_input_errors(self):
        for data, mime, status in [(b"", "image/png", 422), (b"fake", "image/png", 422),
                                   (photo(), "text/plain", 415), (photo(), "image/jpeg", 415)]:
            with self.subTest(status=status):
                response = self.client.post("/predict", content=data,
                                            headers={**HEADERS, "Content-Type": mime})
                self.assertEqual(response.status_code, status)

    def test_oversized_declared_length(self):
        response = self.client.post("/predict", content=b"x",
                                    headers={**HEADERS, "Content-Length": str(MAX_BYTES + 1)})
        self.assertEqual(response.status_code, 413)
        self.assertEqual(self.api.state.predictor.calls, 0)

    def test_oversized_chunked_body(self):
        response = self.client.post("/predict", content=(b"x" * 1024 * 1024 for _ in range(11)), headers=HEADERS)
        self.assertEqual(response.status_code, 413)

    def test_bad_content_length(self):
        for value in ["-1", "no", "9" * 5000]:
            response = self.client.post("/predict", content=b"x", headers={**HEADERS, "Content-Length": value})
            self.assertEqual(response.status_code, 400)

    def test_model_failure_does_not_leak_details(self):
        with patch.object(self.api.state.predictor, "predict", side_effect=RuntimeError("secret path")):
            response = self.client.post("/predict", content=photo(), headers=HEADERS)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("secret", response.text)

    def test_cannot_emit_a_demo_or_invalid_confidence(self):
        for invalid in [{"label": "healthy", "confidence": 99.0, "isDemo": True},
                        {"label": "rust", "confidence": float("nan"), "isDemo": False}]:
            with patch.object(self.api.state.predictor, "predict", return_value=invalid):
                self.assertEqual(self.client.post("/predict", content=photo(), headers=HEADERS).status_code, 503)

    def test_settings_and_checkpoint_fail_closed(self):
        with self.assertRaises(ValueError):
            Settings("")
        with TemporaryDirectory() as directory:
            path = Path(directory) / "wrong.pth"
            path.write_bytes(b"not the checkpoint")
            with self.assertRaises(ValueError), TestClient(create_app(Settings(TOKEN, checkpoint=path))):
                pass


class RealInferenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = Predictor(DEFAULT_CHECKPOINT)

    def test_preprocessing_matches_evaluation(self):
        with decode_photo(photo(), "image/png") as image:
            expected = TF.normalize(TF.to_tensor(TF.resize(image, [224, 224])),
                                    [0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            self.assertTrue(torch.equal(self.predictor.transform(image), expected))
        self.assertFalse(self.predictor.model.training)

    def test_busy_does_not_queue_unbounded_inference(self):
        self.predictor.lock.acquire()
        try:
            with self.assertRaises(PredictionError) as caught:
                self.predictor.predict(photo(), "image/png")
            self.assertEqual(caught.exception.status, 503)
        finally:
            self.predictor.lock.release()

    def test_real_checkpoint_through_api_for_all_formats(self):
        api = create_app(Settings(TOKEN), predictor_factory=lambda *_: self.predictor)
        with TestClient(api) as client:
            for fmt, mime in [("JPEG", "image/jpeg"), ("PNG", "image/png"), ("WEBP", "image/webp")]:
                with self.subTest(fmt=fmt):
                    start = perf_counter()
                    response = client.post("/predict", content=photo(fmt), headers={**HEADERS, "Content-Type": mime})
                    self.assertEqual(response.status_code, 200, response.text)
                    result = response.json()
                    self.assertEqual(set(result), {"label", "confidence", "isDemo"})
                    self.assertIn(result["label"], ["healthy", "rust"])
                    self.assertTrue(0 <= result["confidence"] <= 100)
                    self.assertIs(result["isDemo"], False)
                    print("REAL_INFERENCE " + json.dumps({"format": fmt, "response": result,
                          "inference_ms": float(response.headers["X-Inference-Time-Ms"]),
                          "total_ms": round((perf_counter() - start) * 1000, 2)}))


if __name__ == "__main__":
    unittest.main()
