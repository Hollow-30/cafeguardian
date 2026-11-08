# CafeGuardian — Machine Learning

## Objetivo

Desarrollar y evaluar el componente de aprendizaje automático de CafeGuardian para la detección de roya en hojas de café.

## Estructura

* `notebooks/`: experimentación y análisis en Kaggle o Google Colab.
* `src/`: scripts reutilizables para preparación de datos, división de conjuntos, aumento de datos, entrenamiento y evaluación.
* `reports/`: resultados experimentales, distribución de clases y evidencias de validación.

## Preparación de datos

El conjunto de datos original se mantiene separado del código fuente.

La preparación de los datos debe garantizar:

* División reproducible entre entrenamiento, validación y prueba.
* Prevención de fugas de datos entre conjuntos.
* Aumento de datos únicamente para entrenamiento.
* Documentación de la distribución por clase.
* Atribución y cumplimiento de la licencia del conjunto utilizado.

## CAFG-107: servicio de predicción

El servicio CPU en `service/` expone el checkpoint verificado mediante FastAPI.
La app lo consume a través de una ruta Next autenticada y ya no usa el simulador
por defecto. Instalación, contrato HTTP, errores, medición, contenedor y pruebas:
[`docs/servicio-prediccion.md`](../docs/servicio-prediccion.md).

## Entorno de experimentación

La experimentación y el entrenamiento podrán ejecutarse en Kaggle o Google Colab.

Los scripts, las configuraciones relevantes y los resultados necesarios para reproducir los experimentos se versionarán en el repositorio.

## CAFG-106: evaluación independiente

`notebooks/04-evaluacion-modelo.ipynb` restaura el checkpoint de CAFG-104 sin
entrenamiento, ajuste de umbrales ni descarga de pesos de ImageNet. Usa CPU,
`model.eval()`, `torch.inference_mode()`, batch 16 y el preprocesamiento de
validación de `src/dataset.py`. El cargador admite `image_root` opcional; sus
llamadas existentes conservan el comportamiento anterior.

El manifiesto `reports/dataset_manifest.csv` es inmutable. No ejecutar otra
división ni regenerar el manifiesto. Las validaciones exigen:

- SHA-256 original del manifiesto y checkpoint (constantes en `src/evaluation.py`).
- Train 350+350, val 75+75 y test 75+75, sin rutas ni hashes duplicados.
- Identidad SHA-256 de cada una de las 150 imágenes de test.
- Exclusión única autorizada en `reports/evaluation_exclusions.json`:
  `Roya/Roya 752.jpg`, por corrupción JPEG comprobada. La selección exige
  exactamente 149 imágenes evaluables: 74 Roya y 75 Sanas.
- ResNet18, clases `Roya: 0`, `Sanas: 1`, RGB 224 × 224 y normalización ImageNet.
- Carga estricta del state dict; logits finitos y dos salidas por imagen.

Dependencias de ejecución: PyTorch, Torchvision, pandas, Pillow, NumPy y
Matplotlib. El entrenamiento registró `torch==2.11.0+cpu` y
`torchvision==0.26.0+cpu`; seleccionar un entorno compatible y registrar sus
versiones. El notebook no instala paquetes automáticamente. Las versiones
efectivas y hashes del código se incluyen en `procedencia.json`.

### Procedimiento en Kaggle

1. Adjuntar como **input existente**
   `claudiobances/coffee-leaf-dataset-by-phytosanitary-class`. No duplicar las imágenes.
2. Preparar, revisar y subir un recurso **privado** con esta estructura, conservando
   los archivos originales del checkpoint y manifiesto byte por byte:

   ```text
   ml/
   ├── src/dataset.py
   ├── src/evaluation.py
   ├── reports/dataset_manifest.csv
   ├── reports/evaluation_exclusions.json
   └── models/resnet18_coffee_base.pth
   ```

3. Crear un notebook privado desde `04-evaluacion-modelo.ipynb` y adjuntar dicho
   recurso. No ejecutar los notebooks 02 o 03. No depender de `mlscript`/`mlscript1`.
4. Configurar las rutas en la primera celda mediante variables de entorno o
   editar sus valores antes de ejecutar:

   | Variable | Ubicación |
   |---|---|
   | `CAFG_ML_ROOT` | Carpeta `ml` del recurso privado adjunto |
   | `CAFG_SOURCE_DIR` | Opcional: carpeta con `dataset.py` y `evaluation.py` |
   | `CAFG_MANIFEST` | Opcional: manifiesto original |
   | `CAFG_CHECKPOINT` | Opcional: checkpoint original |
   | `CAFG_EXCLUSIONS` | Registro de la única exclusión autorizada |
   | `CAFG_IMAGE_ROOT` | Carpeta `coffee_leaves` que contiene `Roya` y `Sanas` |
   | `CAFG_OUTPUT_DIR` | Directorio vacío bajo `/kaggle/working` |

5. Usar CPU y desactivar Internet si todos los inputs están adjuntos. Ejecutar
   desde una sesión limpia. Si se importó otro `dataset.py`, reiniciar la sesión.
6. Ejecutar las celdas en orden. Cualquier hash o configuración incompatible
   detiene la evaluación; no omitir las comprobaciones para continuar.
7. Revisar los resultados y guardar una versión con outputs, tras autorización
   para ejecución remota. Fijar las versiones de los inputs usados y conservar
   el entorno registrado para posteriores reproducciones.

El recurso privado puede contener los cinco archivos en su raíz; en ese caso
configurar explícitamente `CAFG_SOURCE_DIR`, `CAFG_MANIFEST`, `CAFG_CHECKPOINT`
y `CAFG_EXCLUSIONS` con sus rutas planas. El notebook remoto añade esa
configuración sin cambiar el código de evaluación.

Se generarán `metricas.json`, `procedencia.json`, `exclusiones.json`,
`predicciones.csv` (**149 filas: 74 Roya y 75 Sanas**),
`errores.csv`, `matriz_confusion.png`, galerías por dirección de error cuando
existan errores, e `informe.md`. La selección visual muestra hasta ocho errores
de mayor confianza por dirección; el CSV conserva todos. Si no hay errores,
el informe lo indica y no se fabrica una galería. Las métricas indefinidas se
reportan como cero. Las conclusiones automáticas delimitan el alcance; el
equipo debe añadir su revisión cualitativa después de inspeccionar los ejemplos.

El informe distingue test original (150), excluida por integridad (1) y test
efectivamente evaluado (149). El manifiesto permanece intacto y se verifican
los hashes de las 150 imágenes originales, incluida la excluida. Solo se
elimina su índice de la inferencia mediante `torch.utils.data.Subset`, sin
alterar el cargador ni aplicar lectura tolerante. La exclusión se decidió por
integridad antes de la evaluación definitiva, no por desempeño del modelo,
y limita las conclusiones al subconjunto de 149 imágenes válidas.

El directorio de salida debe estar vacío para evitar mezclar ejecuciones.
Si una ejecución falla después de iniciar la escritura, conservarla para
diagnóstico y usar otro directorio para reintentar.

### Validaciones locales sin el dataset original

```powershell
python -B -m unittest discover -s ml/tests -v
```

Estas pruebas usan datos sintéticos temporales, comprueban cálculos, detección
de fugas/corrupción, orden de clases, identidad de los artefactos versionados y
estructura ZIP/CRC del checkpoint. No miden el rendimiento del modelo.
La carga real de tensores, inferencia, generación de figuras e informe se
validan en Kaggle con las dependencias instaladas. La ejecución autorizada del
8 de noviembre de 2026 restauró correctamente el checkpoint, pero se detuvo
porque `Roya/Roya 752.jpg` no se decodifica en modo estricto con Pillow 13.0.0,
aunque su SHA-256 coincide con el manifiesto. El diagnóstico y los logs están
en `reports/cafg106-kaggle-v2/`. Posteriormente se autorizó excluir únicamente
esa imagen. La evaluación definitiva utiliza el registro de exclusión, sin
reentrenar ni modificar el checkpoint, JPEG o manifiesto. Los resultados finales
se conservarán como una ejecución distinta de los diagnósticos iniciales.

### Resultado verificado sobre 149 imágenes

La versión 3 del notebook 04 completó la evaluación: **147/149 aciertos
(98,6577 %)**, con 74 Roya y 75 Sanas. Matriz de confusión (filas reales,
columnas predichas, orden Roya/Sanas): `[[74, 0], [2, 73]]`.
No hubo errores Roya → Sanas; hubo dos Sanas → Roya.

El [informe final](reports/cafg106-evaluacion-149/resultados-verificados.md)
contiene métricas por clase, revisión visual y limitaciones por la exclusión.
Los outputs originales, predicciones, registro de exclusión, procedencia,
notebook versionado y logs se conservan en `reports/cafg106-evaluacion-149/`.
La auditoría independiente se reproduce con:

```powershell
python -B ml/reports/cafg106-evaluacion-149/verify_results.py
```

Estas métricas corresponden exclusivamente al test evaluable de 149 imágenes,
no a las 150 imágenes originales ni a un conjunto externo.
