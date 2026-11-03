# Modelo base de clasificación de roya en hojas de café

## 1. Objetivo

Entrenar un modelo de clasificación binaria capaz de identificar hojas de café en dos categorías: Roya y Sanas.

## 2. Dataset

Se utilizaron 1,000 imágenes:

* Roya: 500 imágenes.
* Sanas: 500 imágenes.

La distribución fue estratificada, utilizando una semilla fija de 42.

| Conjunto      | Imágenes | Porcentaje |
| ------------- | -------: | ---------: |
| Entrenamiento |      700 |        70% |
| Validación    |      150 |        15% |
| Prueba        |      150 |        15% |
| Total         |    1,000 |       100% |

La categoría Ojo de Gallo fue excluida del entrenamiento.

## 3. Arquitectura

Se utilizó ResNet18 preentrenada con ImageNet mediante transferencia de aprendizaje.

* Arquitectura: ResNet18.
* Pesos iniciales: ImageNet.
* Capas convolucionales: congeladas.
* Capa final: reemplazada por una capa de clasificación de dos clases.
* Tamaño de entrada: 224 × 224 píxeles.
* Normalización: estadísticas de ImageNet.

## 4. Configuración del entrenamiento

| Parámetro           | Valor            |
| ------------------- | ---------------- |
| Épocas              | 5                |
| Batch size          | 16               |
| Optimizador         | Adam             |
| Learning rate       | 0.001            |
| Función de pérdida  | CrossEntropyLoss |
| Dispositivo         | CPU              |
| Semilla de división | 42               |

## 5. Resultados de validación

| Métrica         | Resultado |
| --------------- | --------: |
| Validation Loss |    0.1035 |
| Accuracy        |    98.00% |
| Precision macro |    98.01% |
| Recall macro    |    98.00% |
| F1-score macro  |    98.00% |

### Matriz de confusión

| Clase real | Predicción Roya | Predicción Sanas |
| ---------- | --------------: | ---------------: |
| Roya       |              74 |                1 |
| Sanas      |               2 |               73 |

Se obtuvieron 147 clasificaciones correctas y 3 incorrectas sobre 150 imágenes.

## 6. Guardado del modelo

Los pesos y la configuración del modelo se almacenaron en:

`ml/models/resnet18_coffee_base.pth`

El archivo contiene:

* Pesos entrenados.
* Arquitectura.
* Número de clases.
* Correspondencia entre clases y etiquetas.
* Tamaño de imagen.
* Parámetros de normalización.
* Configuración del entrenamiento.
* Métricas de validación.

## 7. Reproducción

Para reproducir el entrenamiento:

1. Preparar el entorno con las dependencias de PyTorch y Torchvision.
2. Descargar o habilitar el acceso al dataset original.
3. Ejecutar el notebook `notebooks/02-division-dataset.ipynb`.
4. Verificar la generación del manifiesto del dataset.
5. Ejecutar `notebooks/03-entrenamiento-modelo-base.ipynb`.
6. Verificar las métricas de validación.
7. Guardar los pesos del modelo.

## 8. Consideraciones

Los resultados reportados corresponden al conjunto de validación. La evaluación independiente sobre el conjunto de prueba está pendiente.

El modelo constituye una versión base para su posterior evaluación e integración en CafeGuardian.
