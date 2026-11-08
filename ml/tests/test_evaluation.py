"""Pruebas locales sin imágenes originales ni dependencias de ML."""

import copy
import csv
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))
import evaluation as ev


class MetricsTests(unittest.TestCase):
    def test_asymmetric_confusion_matrix(self):
        result = ev.calculate_metrics([0, 0, 0, 1, 1], [0, 0, 1, 0, 1])
        self.assertEqual(result["confusion_matrix"], [[2, 1], [1, 1]])
        self.assertAlmostEqual(result["accuracy"], 0.6)
        self.assertAlmostEqual(result["per_class"]["Roya"]["precision"], 2 / 3)
        self.assertAlmostEqual(result["per_class"]["Sanas"]["f1"], 0.5)

    def test_false_negative_and_false_positive_orientation(self):
        result = ev.calculate_metrics([0, 0, 1, 1], [1, 1, 0, 1])
        self.assertEqual(result["confusion_matrix"], [[0, 2], [1, 1]])
        self.assertEqual(result["per_class"]["Roya"]["recall"], 0)
        self.assertAlmostEqual(result["per_class"]["Sanas"]["precision"], 1 / 3)

    def test_zero_predictions_for_a_class(self):
        result = ev.calculate_metrics([0, 1], [0, 0])
        self.assertEqual(result["per_class"]["Sanas"]["precision"], 0)
        self.assertEqual(result["per_class"]["Sanas"]["f1"], 0)

    def test_invalid_input(self):
        for labels, predictions in [([], []), ([0], []), ([2], [0]), ([0], [-1])]:
            with self.subTest(labels=labels, predictions=predictions):
                with self.assertRaises(ValueError):
                    ev.calculate_metrics(labels, predictions)


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.rows = []
        for split, count in [("train", 350), ("val", 75), ("test", 75)]:
            for name in ev.CLASSES:
                for i in range(count):
                    filename = f"{split}-{i}.jpg"
                    content = f"{name}-{filename}".encode()
                    self.rows.append({"ruta": f"/old/kaggle/coffee_leaves/{name}/{filename}",
                                      "clase": name, "split": split,
                                      "sha256": hashlib.sha256(content).hexdigest()})
                    if split == "test":
                        target = self.root / name / filename
                        target.parent.mkdir(exist_ok=True)
                        target.write_bytes(content)
        self.manifest = self.root / "manifest.csv"

    def write_manifest(self):
        with self.manifest.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["ruta", "clase", "sha256", "split"])
            writer.writeheader()
            writer.writerows(self.rows)
        return patch.object(ev, "MANIFEST_SHA256", ev.sha256(self.manifest))

    def test_relocated_images_and_unchanged_manifest(self):
        with self.write_manifest():
            before = self.manifest.read_bytes()
            self.assertEqual(len(ev.validate_manifest(self.manifest, self.root)), 150)
            self.assertEqual(self.manifest.read_bytes(), before)

    def test_corrupt_image(self):
        with self.write_manifest():
            (self.root / "Roya/test-0.jpg").write_bytes(b"corrupt")
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                ev.validate_manifest(self.manifest, self.root)

    def test_missing_image(self):
        with self.write_manifest():
            (self.root / "Roya/test-0.jpg").unlink()
            with self.assertRaises(FileNotFoundError):
                ev.validate_manifest(self.manifest, self.root)

    def test_hash_leakage(self):
        self.rows[-1]["sha256"] = self.rows[0]["sha256"]
        with self.write_manifest():
            with self.assertRaisesRegex(ValueError, "fuga"):
                ev.validate_manifest(self.manifest, self.root)

    def test_wrong_distribution(self):
        self.rows.pop()
        with self.write_manifest():
            with self.assertRaisesRegex(ValueError, "Distribución"):
                ev.validate_manifest(self.manifest, self.root)

    def test_manifest_identity(self):
        with self.write_manifest():
            with self.manifest.open("a") as f:
                f.write("\n")
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                ev.validate_manifest(self.manifest, self.root)


class CheckpointTests(unittest.TestCase):
    def test_repository_artifacts(self):
        ml = SRC.parent
        ev.verify_artifact(ml / "reports/dataset_manifest.csv", ev.MANIFEST_SHA256)
        checkpoint = ml / "models/resnet18_coffee_base.pth"
        ev.verify_artifact(checkpoint, ev.CHECKPOINT_SHA256)
        with zipfile.ZipFile(checkpoint) as archive:
            self.assertIsNone(archive.testzip())

    def test_metadata_and_reversed_classes(self):
        metadata = {"model_name": "resnet18", "num_classes": 2,
                    "class_to_idx": {"Roya": 0, "Sanas": 1}, "image_size": 224,
                    "normalization": {"mean": [0.485, 0.456, 0.406],
                                      "std": [0.229, 0.224, 0.225]},
                    "model_state_dict": {"placeholder": 1}}
        ev.validate_checkpoint_metadata(metadata)
        for key, value in [("class_to_idx", {"Roya": 1, "Sanas": 0}),
                           ("image_size", 256), ("model_name", "resnet50"),
                           ("normalization", {}), ("model_state_dict", {})]:
            bad = copy.deepcopy(metadata)
            bad[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                ev.validate_checkpoint_metadata(bad)

    def test_notebook_has_no_saved_results_and_compiles(self):
        notebook = json.loads((SRC.parent / "notebooks/04-evaluacion-modelo.ipynb").read_text(encoding="utf-8"))
        for cell in notebook["cells"]:
            self.assertIn("id", cell)
            self.assertNotIn("?", "".join(cell["source"]))
            if cell["cell_type"] == "code":
                self.assertEqual(cell["outputs"], [])
                self.assertIsNone(cell["execution_count"])
                compile("".join(cell["source"]), "notebook", "exec")


class ExclusionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "exclusions.json"
        self.registry = json.loads((SRC.parent / "reports/evaluation_exclusions.json").read_text(encoding="utf-8"))
        with (SRC.parent / "reports/dataset_manifest.csv").open(encoding="utf-8-sig", newline="") as f:
            self.test = [r for r in csv.DictReader(f) if r["split"] == "test"]

    def select(self):
        self.path.write_text(json.dumps(self.registry), encoding="utf-8")
        return ev.select_evaluable_test(self.test, self.path)

    def test_exactly_149_in_original_order_without_mutation(self):
        original = copy.deepcopy(self.test)
        rows, indices, registry = self.select()
        self.assertEqual(self.test, original)
        self.assertEqual(len(rows), 149)
        self.assertEqual(sum(r["clase"] == "Roya" for r in rows), 74)
        self.assertEqual(sum(r["clase"] == "Sanas" for r in rows), 75)
        self.assertEqual(rows, [original[i] for i in indices])
        self.assertEqual(indices, sorted(set(indices)))
        excluded = [r for i, r in enumerate(original) if i not in indices]
        self.assertEqual(excluded, [ev.AUTHORIZED_EXCLUSION])
        self.assertEqual(registry, self.registry)

    def test_zero_or_multiple_exclusions_rejected(self):
        for exclusions in [[], self.registry["exclusions"] * 2]:
            self.registry["exclusions"] = exclusions
            with self.subTest(count=len(exclusions)), self.assertRaises(ValueError):
                self.select()

    def test_different_identity_or_reason_rejected(self):
        original = copy.deepcopy(self.registry)
        for key, value in [("ruta", "Roya/otra.jpg"), ("sha256", "0" * 64),
                           ("clase", "Sanas"), ("split", "val"),
                           ("reason_code", "low_confidence"), ("reason", "")]:
            self.registry = copy.deepcopy(original)
            self.registry["exclusions"][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.select()

    def test_wrong_manifest_or_missing_authorization_rejected(self):
        original = copy.deepcopy(self.registry)
        for key, value in [("source_manifest_sha256", "0" * 64), ("authorization", "")]:
            self.registry = copy.deepcopy(original)
            self.registry[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.select()

    def test_missing_or_mismatched_original_row_rejected(self):
        self.test = copy.deepcopy(self.test)
        index = next(i for i, row in enumerate(self.test) if row == ev.AUTHORIZED_EXCLUSION)
        self.test[index]["sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "única fila"):
            self.select()

    def test_wrong_original_class_distribution_rejected(self):
        self.test[0]["clase"] = "Sanas" if self.test[0]["clase"] == "Roya" else "Roya"
        with self.assertRaisesRegex(ValueError, "Test original"):
            self.select()


if __name__ == "__main__":
    unittest.main()
