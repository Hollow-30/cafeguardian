"""Evaluación CAFG-106. No entrena ni descarga modelos o imágenes."""

import csv
import hashlib
import json
import math
import platform
from datetime import datetime, timezone
from importlib.metadata import version
from collections import Counter
from pathlib import Path

CLASSES = {"Roya": 0, "Sanas": 1}
MANIFEST_SHA256 = "b108a954018011e4d4705342970f27921ca90d29d79d5099e988c2c0cf147cde"
CHECKPOINT_SHA256 = "b100e884ee036697f764b4d96b324db8e7a5c3148900552bbdffd7d5d01d29ce"
AUTHORIZED_EXCLUSION = {
    "ruta": "/kaggle/input/datasets/claudiobances/coffee-leaf-dataset-by-phytosanitary-class/coffee_leaves/Roya/Roya 752.jpg",
    "sha256": "4134a59cdff7584c8ce4a80f40ca4e410988599c11d30a9474b4034caab93ff1",
    "clase": "Roya", "split": "test",
}


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def verify_artifact(path, expected):
    actual = sha256(path)
    if actual != expected:
        raise ValueError(f"SHA-256 inesperado: {path}: {actual}")
    return actual


def validate_manifest(path, image_root):
    """Verifica el manifiesto original y cada imagen de test sin escribir insumos."""
    verify_artifact(path, MANIFEST_SHA256)
    with Path(path).open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if not {"ruta", "clase", "sha256", "split"} <= set(reader.fieldnames or []):
            raise ValueError("Manifiesto incompleto")
        rows = list(reader)
    expected = {(split, name): count for split, count in
                [("train", 350), ("val", 75), ("test", 75)] for name in CLASSES}
    if Counter((r["split"], r["clase"]) for r in rows) != expected:
        raise ValueError("Distribución distinta de CAFG-103")
    seen = set()
    paths = set()
    for row in rows:
        if row["sha256"] in seen or row["ruta"] in paths:
            raise ValueError("Duplicado o fuga entre conjuntos")
        seen.add(row["sha256"])
        paths.add(row["ruta"])
    test = [r for r in rows if r["split"] == "test"]
    root = Path(image_root).resolve(strict=True)
    for row in test:
        image = (root / row["clase"] / Path(row["ruta"]).name).resolve(strict=True)
        if not image.is_relative_to(root):
            raise ValueError("Imagen fuera de image_root")
        verify_artifact(image, row["sha256"])
    return test


def select_evaluable_test(test, exclusions_path):
    """Aplica únicamente la exclusión autorizada; no modifica filas del manifiesto."""
    registry = json.loads(Path(exclusions_path).read_text(encoding="utf-8"))
    if (registry.get("schema_version") != 1 or registry.get("issue") != "CAFG-106"
            or registry.get("source_manifest_sha256") != MANIFEST_SHA256
            or not registry.get("authorization")):
        raise ValueError("Registro de exclusiones incompatible")
    exclusions = registry.get("exclusions", [])
    if len(exclusions) != 1:
        raise ValueError("Se permite exactamente una exclusión autorizada")
    exclusion = exclusions[0]
    if (any(exclusion.get(k) != v for k, v in AUTHORIZED_EXCLUSION.items())
            or exclusion.get("reason_code") != "corrupt_jpeg" or not exclusion.get("reason")):
        raise ValueError("Exclusión distinta de Roya 752.jpg autorizada por integridad")
    if len(test) != 150 or Counter(r["clase"] for r in test) != {"Roya": 75, "Sanas": 75}:
        raise ValueError("Test original distinto de 150 imágenes (75/75)")
    excluded_indices = [i for i, row in enumerate(test)
                        if all(row.get(k) == v for k, v in AUTHORIZED_EXCLUSION.items())]
    if len(excluded_indices) != 1:
        raise ValueError("La exclusión no identifica una única fila del test original")
    indices = [i for i in range(len(test)) if i != excluded_indices[0]]
    selected = [test[i] for i in indices]
    if len(selected) != 149 or Counter(r["clase"] for r in selected) != {"Roya": 74, "Sanas": 75}:
        raise ValueError("Test evaluable distinto de 149 imágenes (74/75)")
    return selected, indices, registry


def validate_checkpoint_metadata(checkpoint):
    expected = {"model_name": "resnet18", "num_classes": 2,
                "class_to_idx": CLASSES, "image_size": 224,
                "normalization": {"mean": [0.485, 0.456, 0.406],
                                  "std": [0.229, 0.224, 0.225]}}
    for key, value in expected.items():
        if checkpoint.get(key) != value:
            raise ValueError(f"Checkpoint incompatible: {key}")
    if not checkpoint.get("model_state_dict"):
        raise ValueError("Checkpoint sin pesos")


def calculate_metrics(labels, predictions):
    if not labels or len(labels) != len(predictions):
        raise ValueError("Etiquetas y predicciones deben tener igual longitud no vacía")
    cm = [[0, 0], [0, 0]]
    for real, predicted in zip(labels, predictions):
        if real not in (0, 1) or predicted not in (0, 1):
            raise ValueError("Etiqueta desconocida")
        cm[real][predicted] += 1
    per_class = {}
    for name, index in CLASSES.items():
        tp = cm[index][index]
        support = sum(cm[index])
        predicted_count = sum(row[index] for row in cm)
        precision = tp / predicted_count if predicted_count else 0.0
        recall = tp / support if support else 0.0
        per_class[name] = {"precision": precision, "recall": recall,
                           "f1": 2 * precision * recall / (precision + recall)
                           if precision + recall else 0.0, "support": support}
    return {"accuracy": sum(cm[i][i] for i in (0, 1)) / len(labels),
            "per_class": per_class, "confusion_matrix": cm,
            "class_order": list(CLASSES), "total": len(labels),
            "zero_division": 0}


def evaluate(manifest_path, checkpoint_path, image_root, output_dir, exclusions_path, batch_size=16):
    """Evalúa una sola vez test y produce evidencia únicamente tras inferencia real."""
    if not isinstance(batch_size, int) or batch_size <= 0:
        raise ValueError("batch_size debe ser un entero positivo")
    output = Path(output_dir)
    if output.exists() and any(output.iterdir()):
        raise ValueError("Utiliza un directorio de resultados vacío para evitar mezclar ejecuciones")
    original_test = validate_manifest(manifest_path, image_root)
    test, indices, registry = select_evaluable_test(original_test, exclusions_path)
    checkpoint_hash = verify_artifact(checkpoint_path, CHECKPOINT_SHA256)

    import torch
    import torchvision
    from torchvision import models
    from torch.utils.data import DataLoader, Subset
    from PIL import ImageFile
    import dataset as dataset_module
    from dataset import create_dataset

    if Path(dataset_module.__file__).resolve() != Path(__file__).resolve().with_name("dataset.py"):
        raise ValueError("dataset.py debe proceder del mismo directorio que evaluation.py")
    if ImageFile.LOAD_TRUNCATED_IMAGES:
        raise ValueError("La evaluación requiere decodificación estricta, sin lectura tolerante")

    torch.manual_seed(42)
    torch.use_deterministic_algorithms(True)
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    validate_checkpoint_metadata(checkpoint)
    model = models.resnet18(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, 2)
    model.load_state_dict(checkpoint["model_state_dict"], strict=True)
    model.eval()
    dataset = create_dataset(manifest_path, "test", image_root=image_root)
    if dataset.class_to_idx != CLASSES or len(dataset) != 150:
        raise ValueError("Dataset de test incompatible")
    loader = DataLoader(Subset(dataset, indices), batch_size=batch_size, shuffle=False, num_workers=0)
    labels, predictions, confidences = [], [], []
    with torch.inference_mode():
        for images, target in loader:
            logits = model(images)
            if logits.shape != (len(target), 2) or not torch.isfinite(logits).all():
                raise ValueError("Salida del modelo inválida")
            confidence, predicted = torch.softmax(logits, dim=1).max(dim=1)
            labels.extend(target.tolist())
            predictions.extend(predicted.tolist())
            confidences.extend(confidence.tolist())
    if labels != [CLASSES[row["clase"]] for row in test]:
        raise ValueError("Orden de etiquetas distinto del manifiesto")
    metrics = calculate_metrics(labels, predictions)
    metrics["original_test"] = {"total": 150, "per_class": {"Roya": 75, "Sanas": 75}}
    metrics["evaluated_test"] = {"total": 149, "per_class": {"Roya": 74, "Sanas": 75}}
    metrics["excluded_count"] = 1
    names = list(CLASSES)
    records = [{"ruta": row["ruta"], "sha256": row["sha256"],
                "real": names[real], "prediccion": names[predicted],
                "confianza": confidence, "correcta": real == predicted}
               for row, real, predicted, confidence in
               zip(test, labels, predictions, confidences)]
    provenance = {"manifest_sha256": sha256(manifest_path),
                  "evaluated_at_utc": datetime.now(timezone.utc).isoformat(),
                  "evaluation_source_sha256": sha256(__file__),
                  "dataset_source_sha256": sha256(dataset_module.__file__),
                  "exclusions_sha256": sha256(exclusions_path),
                  "exclusions": registry,
                  "original_test_count": 150, "evaluated_test_count": 149,
                  "packages": {name: version(name) for name in ["pandas", "Pillow", "matplotlib", "numpy"]},
                  "checkpoint_sha256": checkpoint_hash, "python": platform.python_version(),
                  "torch": torch.__version__, "torchvision": torchvision.__version__,
                  "device": "cpu", "batch_size": batch_size, "seed": 42,
                  "preprocessing": checkpoint["normalization"], "image_size": 224,
                  "class_to_idx": CLASSES, "split": "test", "augmentation": False,
                  "strict_image_decoding": True}
    output.mkdir(parents=True, exist_ok=True)
    for filename, data in [("metricas.json", metrics), ("procedencia.json", provenance),
                           ("exclusiones.json", registry)]:
        (output / filename).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    for filename, data in [("predicciones.csv", records),
                           ("errores.csv", [r for r in records if not r["correcta"]])]:
        with (output / filename).open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=list(records[0]))
            writer.writeheader()
            writer.writerows(data)
    write_visuals_and_report(output, image_root, records, metrics, registry)
    return metrics


def write_visuals_and_report(output, image_root, records, metrics, registry):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from PIL import Image

    cm = metrics["confusion_matrix"]
    fig, ax = plt.subplots(figsize=(5, 4))
    ax.imshow(cm, cmap="Blues")
    ax.set(xticks=[0, 1], yticks=[0, 1], xticklabels=list(CLASSES),
           yticklabels=list(CLASSES), xlabel="Predicción", ylabel="Clase real",
           title=f"Test evaluable (n={metrics['total']}; 1 exclusión por integridad)")
    for i in (0, 1):
        for j in (0, 1):
            ax.text(j, i, str(cm[i][j]), ha="center", va="center")
    fig.tight_layout()
    fig.savefig(output / "matriz_confusion.png", dpi=160)
    plt.close(fig)
    error_sections = []
    for real, predicted in [("Roya", "Sanas"), ("Sanas", "Roya")]:
        errors = [r for r in records if r["real"] == real and r["prediccion"] == predicted]
        filename = f"errores_{real}_{predicted}.png"
        count = len(errors)
        support = metrics["per_class"][real]["support"]
        error_sections.append(f"### {real} → {predicted}\n\n{count} de {support} imágenes ({count / support:.2%}).\n")
        if not errors:
            error_sections.append("No se observaron errores en esta dirección.\n")
            continue
        examples = sorted(errors, key=lambda r: r["confianza"], reverse=True)[:8]
        fig, axes = plt.subplots(math.ceil(len(examples) / 4), 4, figsize=(12, 3 * math.ceil(len(examples) / 4)), squeeze=False)
        for ax in axes.flat:
            ax.axis("off")
        for ax, row in zip(axes.flat, examples):
            path = Path(image_root) / real / Path(row["ruta"]).name
            with Image.open(path) as image:
                ax.imshow(image.convert("RGB"))
            ax.set_title(f"{Path(row['ruta']).name}\n{real} → {predicted}: {row['confianza']:.1%}", fontsize=8)
        fig.tight_layout()
        fig.savefig(output / filename, dpi=160)
        plt.close(fig)
        error_sections.append(f"Hasta 8 errores de mayor confianza:\n\n![Errores]({filename})\n")
    table = ["| Clase | Precisión | Recuperación | F1 | Soporte |", "|---|---:|---:|---:|---:|"]
    for name, values in metrics["per_class"].items():
        table.append(f"| {name} | {values['precision']:.4f} | {values['recall']:.4f} | {values['f1']:.4f} | {values['support']} |")
    excluded = registry["exclusions"][0]
    text = (f"# CAFG-106: evaluación independiente\n\nExactitud global: {metrics['accuracy']:.4%} sobre {metrics['total']} imágenes evaluadas.\n\n"
            + "## Conjunto original y conjunto evaluado\n\n"
            "| Conjunto | Roya | Sanas | Total |\n|---|---:|---:|---:|\n"
            "| Test original inmutable | 75 | 75 | 150 |\n"
            "| Exclusión por integridad | 1 | 0 | 1 |\n"
            "| Test efectivamente evaluado | 74 | 75 | 149 |\n\n"
            f"Se excluyó únicamente `Roya/Roya 752.jpg`, SHA-256 `{excluded['sha256']}`. "
            f"Motivo técnico: {excluded['reason']} La exclusión fue autorizada antes de la "
            "evaluación definitiva por integridad, no por rendimiento del modelo. "
            "No se alteró el manifiesto ni se regeneró la división.\n\n"
            + "\n".join(table) + "\n\n![Matriz de confusión](matriz_confusion.png)\n\n"
            + "\n".join(error_sections)
            + "\n## Conclusiones y límites\n\nLos resultados corresponden exclusivamente al test fijo de Saposoa. "
            "Roya → Sanas representa roya no detectada; Sanas → Roya representa una falsa alarma. "
            "Los ejemplos permiten inspección visual, pero no demuestran la causa del error. "
            "No se ajustaron pesos ni umbrales usando test. Esta evaluación no mide generalización externa "
            "ni garantiza rendimiento en campo. La confianza softmax no está calibrada. "
            "La exclusión de una imagen corrupta limita las conclusiones al subconjunto evaluable "
            "de 149 imágenes: no son métricas sobre el test original completo de 150. "
            "No se aplicó reparación, sustitución ni lectura tolerante a la imagen excluida. "
            "La revisión cualitativa de los ejemplos por el equipo queda pendiente.\n\n"
            "La trazabilidad se encuentra en procedencia.json y exclusiones.json; las 149 predicciones "
            "y todos los errores se conservan en predicciones.csv y errores.csv. "
            "Métricas indefinidas se reportan como 0.\n")
    (output / "informe.md").write_text(text, encoding="utf-8")
