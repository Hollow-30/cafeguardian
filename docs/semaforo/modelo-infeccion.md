# Modelo de infección de roya y fuente de clima

HU-19 · CAFG-110 · Estado: borrador para revisar. **Todos los parámetros están "a validar".**

## 1. Qué se decide aquí

El semáforo de Café Guardián indica qué tan favorable es el clima de una zona para que la roya del café infecte la hoja. Este documento fija con qué datos de clima se calcula, qué parámetros se usan y cómo se estima el tiempo que la hoja permanece mojada. El cálculo del índice (0 a 1) queda para HU-21.

## 2. Modelo de referencia

Se parte del modelo genérico de infección de hongos foliares de Magarey et al. (2005), que es el que usa SENAMHI para su índice de infección. Ese modelo combina dos cosas: la temperatura durante la infección y el tiempo que la hoja está mojada.

SENAMHI publica su índice como **"producto experimental"**. El semáforo de la app es una guía, no un diagnóstico.

## 3. Parámetros elegidos

Rotulados **"SENAMHI, no los específicos de roya de Magarey"**. Son el punto de partida del plan del frente y no han sido contrastados con la fuente.

| Parámetro | Valor | Cómo se aplica | Estado |
|---|---|---|---|
| Temperatura | 22 a 25 °C (incluidos) | Hora dentro del rango | A validar |
| Humedad relativa | mayor que 90 % | Hora con humedad alta | A validar |
| Lluvia | menor que 10 mm | **Total del día**, no por hora (se muestra también el máximo por hora) | Supuesto a validar |
| Hoja mojada | 6 horas seguidas o más | Racha de horas favorables (ver sección 4) | Supuesto a validar |

Una **hora favorable** es una hora con temperatura en rango y hoja mojada. Un **día favorable** tiene una racha de al menos 6 horas favorables seguidas y menos de 10 mm de lluvia en el día. La racha puede cruzar la medianoche y se le asigna al día en que termina.

## 4. Cómo se estima la hoja mojada

Open-Meteo no mide la hoja mojada. Se usa una **regla propia**, no un dato medido:

> Una hora cuenta como "hoja mojada" si la humedad relativa es mayor que 90 % **o** si llovió algo en esa hora (más de 0 mm).

Limitaciones:

- **No es independiente de la humedad.** La condición "humedad mayor que 90 %" y la de "hoja mojada" se solapan, porque la segunda incluye a la primera. Contar ambas como evidencia separada sería contar dos veces lo mismo.
- No considera rocío por enfriamiento de la hoja, sombra del cafetal ni secado por viento o sol.
- Es una estimación de modelo, no una medición en la parcela. Es un **supuesto a validar** (historia de validación con SENAMHI, S4).

## 5. Fuente de clima

- **Open-Meteo**, endpoint `forecast` con `past_days`, variables por hora `temperature_2m`, `relative_humidity_2m` y `precipitation`, zona horaria `America/Lima`.
- Es gratuita y sin clave, pero **solo para uso no comercial**. Es válida para el MVP académico y se declara aquí. Si el proyecto cobra, hay que cambiar de fuente o contratar el plan comercial.
- Es una estimación de modelo en celdas de unos 9 km, no una medición en la parcela. La app debe decirlo.

## 6. Resultado de la corrida de prueba

Script: `scripts/semaforo/clima-saposoa.mjs` (Node, sin dependencias). Pruebas: `node --test scripts/semaforo/clima-saposoa.test.mjs`.

- Fecha de la corrida: 2-nov-2026. Ventana: del 19-oct al 1-nov (14 días).
- Ubicación: -6.935035721896322, -76.77095139528569 (verificada en un mapa por el Frente Semáforo y avisos).
- `forecast_days=0` funcionó; no hizo falta el plan alterno. Se recibieron **336 horas, 0 sin dato**.
- Resultado: **9 de 14 días favorables**. Horas por día con temperatura en rango: de 5 a 15. Horas con hoja mojada: de 13 a 24.
- De los 5 días no favorables, **4 quedan fuera por la regla de lluvia diaria de 10 mm** (el quinto no llega a las 6 horas seguidas). Esa regla es un **supuesto a validar**.

Lectura: con estos supuestos, casi dos de cada tres días salen favorables y la hoja se considera mojada durante gran parte del día. Eso sugiere que la regla de hoja mojada es **generosa** (en esta zona la humedad pasa de 90 % muchas horas). Un semáforo casi siempre en favorable avisaría de más. Es una razón concreta para contrastar con SENAMHI antes de fijar los umbrales de HU-21.

Limitación de la corrida: solo son 14 días de una época; no basta para afinar umbrales.

<!--## 7. Decisiones abiertas

| Tema | Quién | Estado |
|---|---|---|
| Conseguir el artículo de Magarey et al. 2005 y revisar los valores específicos de roya (temperaturas mínima, óptima y máxima, y duración mínima de hoja mojada) | Frente Semáforo y avisos | Pendiente |
| Si la regla de hoja mojada es demasiado generosa (9 de 14 días favorables) | Frente Semáforo y avisos, con la validación SENAMHI | Pendiente |
| Contrastar una semana de resultados con el índice de SENAMHI (Moyobamba, Naranjillo o Jepelacio) | Frente Semáforo y avisos (historia S4) | Pendiente |
| Fuente de clima si el proyecto cobra | Estableciendo | Pendiente |
| Cómo convertir horas favorables en índice 0 a 1 | HU-21 | Pendiente |-->
