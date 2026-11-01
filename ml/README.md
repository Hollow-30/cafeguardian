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

## Entorno de desarrollo

La experimentación y el entrenamiento podrán ejecutarse en Kaggle o Google Colab.

Los scripts, las configuraciones relevantes y los resultados necesarios para reproducir los experimentos se versionarán en el repositorio.
