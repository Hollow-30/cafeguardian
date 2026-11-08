# CAFG-106: ejecución en Kaggle del 8 de noviembre de 2026

Estado: detenida por fallo de decodificación, sin métricas finales de test.

- Notebook privado: https://www.kaggle.com/code/claudiobances/04-evaluacion-modelo
- Recurso privado versión 1: https://www.kaggle.com/datasets/claudiobances/cafg-106-evaluation-resources/versions/1
- Dataset de imágenes existente: `claudiobances/coffee-leaf-dataset-by-phytosanitary-class`.
- Notebook versión 1: restauración estricta del checkpoint e inferencia iniciada;
  error de Pillow al convertir una imagen a RGB. No se generaron métricas finales.
- Notebook versión 2: diagnóstico completo de lectura previo a inferencia;
  149 imágenes decodificables y una no decodificable. Se detuvo explícitamente.
- CPU, sin GPU/TPU, Internet desactivado. Privacidad del notebook y recurso
  confirmada mediante metadatos de Kaggle.

Las 150 imágenes pasaron las comprobaciones SHA-256 del manifiesto original.
También pasaron la identidad del checkpoint, validación de configuración y
carga estricta del state dict en la versión 1. No se entrenó, no se descargaron
pesos de ImageNet, no se modificaron imágenes y no se excluyeron muestras.

El archivo afectado es `Roya/Roya 752.jpg`, con SHA-256
`4134a59cdff7584c8ce4a80f40ca4e410988599c11d30a9474b4034caab93ff1`.
Pillow 13.0.0, Python 3.13.18, `LOAD_TRUNCATED_IMAGES=False`:
`OSError: broken data stream when reading image file`.

La evidencia original descargada está en `diagnostico_decodificacion.json`
y `04-evaluacion-modelo.log`. Los archivos originales del checkpoint y del
manifiesto permanecen intactos.

El notebook remoto añade configuración de montaje para el paquete plano de
cuatro archivos adjuntos (`dataset.py`, `evaluation.py`, `dataset_manifest.csv`,
`resnet18_coffee_base.pth`). El código evaluador procede de la versión 1 del
recurso privado. La versión 2 añade una comprobación estricta de decodificación
de todas las imágenes y conserva su diagnóstico antes de detenerse.

Pendiente: acordar el tratamiento del fallo de lectura antes de ejecutar la
evaluación completa de 150 imágenes. No habilitar lectura tolerante, reparar,
reemplazar ni excluir el archivo sin una decisión explícita y documentada.
CAFG-106 no se declara completada.
