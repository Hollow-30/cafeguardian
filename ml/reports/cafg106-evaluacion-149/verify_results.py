"""Audita los outputs reales sin ejecutar el modelo ni recalcular predicciones."""

from collections import Counter
import csv
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def verify():
    root = Path(__file__).resolve().parent
    ml = root.parent.parent
    output = root / "evaluacion-cafg-106-149"
    metrics = json.loads((output / "metricas.json").read_text(encoding="utf-8"))
    provenance = json.loads((output / "procedencia.json").read_text(encoding="utf-8"))
    registry = json.loads((ml / "reports/evaluation_exclusions.json").read_text(encoding="utf-8"))
    excluded = registry["exclusions"][0]
    assert registry == json.loads((output / "exclusiones.json").read_text(encoding="utf-8"))
    assert registry == provenance["exclusions"]
    assert len(registry["exclusions"]) == 1
    for field, path in {
        "manifest_sha256": ml / "reports/dataset_manifest.csv",
        "checkpoint_sha256": ml / "models/resnet18_coffee_base.pth",
        "evaluation_source_sha256": ml / "src/evaluation.py",
        "dataset_source_sha256": ml / "src/dataset.py",
        "exclusions_sha256": ml / "reports/evaluation_exclusions.json",
    }.items():
        assert sha256(path) == provenance[field], (field, path)
    original = [r for r in read_csv(ml / "reports/dataset_manifest.csv") if r["split"] == "test"]
    expected = [r for r in original if r["sha256"] != excluded["sha256"]]
    predictions = read_csv(output / "predicciones.csv")
    assert len(original) == 150 and len(expected) == len(predictions) == metrics["total"] == 149
    assert [(r["ruta"], r["sha256"], r["clase"]) for r in expected] == [
        (r["ruta"], r["sha256"], r["real"]) for r in predictions]
    assert Counter(r["real"] for r in predictions) == {"Roya": 74, "Sanas": 75}
    assert len({r["sha256"] for r in predictions}) == 149
    names = ["Roya", "Sanas"]
    matrix = [[0, 0], [0, 0]]
    errors = []
    for row in predictions:
        real, predicted = names.index(row["real"]), names.index(row["prediccion"])
        confidence = float(row["confianza"])
        assert math.isfinite(confidence) and 0.5 <= confidence <= 1.0
        assert row["correcta"] == str(real == predicted)
        matrix[real][predicted] += 1
        if real != predicted:
            errors.append(row)
    assert errors == read_csv(output / "errores.csv")
    assert matrix == metrics["confusion_matrix"]
    correct = sum(matrix[i][i] for i in range(2))
    assert math.isclose(float(Fraction(correct, 149)), metrics["accuracy"], abs_tol=1e-12)
    for i, name in enumerate(names):
        tp = matrix[i][i]
        fp = sum(matrix[j][i] for j in range(2) if j != i)
        fn = sum(matrix[i][j] for j in range(2) if j != i)
        actual = metrics["per_class"][name]
        assert actual["support"] == tp + fn
        for key, value in {"precision": Fraction(tp, tp + fp),
                           "recall": Fraction(tp, tp + fn),
                           "f1": Fraction(2 * tp, 2 * tp + fp + fn)}.items():
            assert math.isclose(actual[key], float(value), abs_tol=1e-12), (name, key)
    assert metrics["class_order"] == names
    assert metrics["original_test"] == {"total": 150, "per_class": {"Roya": 75, "Sanas": 75}}
    assert metrics["evaluated_test"] == {"total": 149, "per_class": {"Roya": 74, "Sanas": 75}}
    assert metrics["excluded_count"] == 1
    assert provenance["strict_image_decoding"] is True
    assert provenance["augmentation"] is False and provenance["device"] == "cpu"
    metadata = json.loads((root / "notebook/kernel-metadata.json").read_text(encoding="utf-8"))
    assert metadata["is_private"] and not metadata["enable_internet"] and not metadata["enable_gpu"]
    audit = {"status": "passed", "notebook": "claudiobances/04-evaluacion-modelo/3",
             "resource_version": "claudiobances/cafg-106-evaluation-resources/2",
             "original_test": 150, "excluded": 1, "evaluated": 149,
             "class_support": {"Roya": 74, "Sanas": 75}, "correct": correct,
             "errors": len(errors), "confusion_matrix": matrix,
             "metrics_recomputed_from_csv": True, "original_order_preserved": True,
             "source_and_artifact_hashes_match": True, "private_cpu_without_internet": True}
    (root / "verificacion-resultados.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return audit


if __name__ == "__main__":
    print(json.dumps(verify(), ensure_ascii=False, indent=2))
