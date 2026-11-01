# Documentación del dataset

## Fuente de los datos

* **Nombre:** Coffee leaf dataset by phytosanitary class.
* **Repositorio:** https://data.mendeley.com/datasets/mfpxg4y65r/1
* **Licencia:** CC BY 4.0 (pendiente de confirmar con los metadatos de la versión utilizada).
* **Uso en el proyecto:** clasificación binaria de hojas de café.

## Clases utilizadas

* `Roya`: hojas clasificadas como afectadas por roya.
* `Sanas`: hojas clasificadas como sanas.
* `Ojo_Gallo`: excluida del experimento actual.

## Preparación del dataset

* Total de imágenes utilizadas: 1,000.
* Entrenamiento: 700 imágenes.
* Validación: 150 imágenes.
* Prueba: 150 imágenes.
* Semilla aleatoria: 42.
* Proporciones: 70 % entrenamiento, 15 % validación y 15 % prueba.
* Aumento de datos: todavía no aplicado.

## Reproducibilidad

La asignación de imágenes se registra en `reports/dataset_manifest.csv`.

La distribución por clase se registra en `reports/distribucion_dataset.csv`.

La configuración de la división se registra en `reports/configuracion_split.json`.

Los archivos de imágenes originales se conservan fuera del repositorio de código.
