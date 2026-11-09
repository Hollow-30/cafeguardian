# Cálculo del semáforo con motivo

HU-21 · CAFG-112 (subtareas CAFG-168 a 171) · Estado: borrador para revisar. **Todos los parámetros son "supuesto a validar".**

Código: `lib/risk/` (`calcular-riesgo.ts`, `params.ts`, `motivo.ts`, `types.ts` y sus pruebas con Vitest).

## 1. Qué hace

La función pura `calcularRiesgo({ fecha, horas }, parametros?)` recibe el clima por hora de una zona y un día, y devuelve:

- `nivel`: `poco_favorable`, `favorable` o `muy_favorable` (o `null` si faltan datos).
- `indice`: de 0 (nada favorable para la infección) a 1 (lo máximo), con dos decimales (o `null`).
- `motivo`: una sola frase en español sencillo para el caficultor.
- `detalle`: horas con dato, racha máxima, lluvia del día, si se aplicó la regla de lluvia y los parámetros usados.

El índice mide qué tan favorable es el clima para la infección. **No es la probabilidad de que la planta tenga roya** y no es un diagnóstico.

No usa red, base de datos, reloj ni azar, y no modifica lo que recibe. La fecha entra como parámetro.

## 2. Regla elegida (Regla B)

1. Una **hora favorable** es una hora con temperatura entre 22 y 25 °C (extremos incluidos) y **hoja húmeda estimada**: humedad relativa mayor que 90 % o lluvia en esa hora.
2. Se busca la **racha** más larga de horas favorables seguidas que termina en una hora del día evaluado. Puede empezar el día anterior: por eso la entrada debe traer el día anterior y el día evaluado.
3. `índice = racha / 12`, con tope 1. Seis horas seguidas dan 0.5, nueve dan 0.75 y doce o más dan 1.
4. Si la lluvia del día es de 10 mm o más, el índice queda en 0 (se puede apagar con `aplicarReglaLluvia`).
5. Niveles: de 0 a menos de 0.5 es `poco_favorable`, de 0.5 a menos de 0.75 es `favorable`, y de 0.75 a 1 es `muy_favorable`.

### Datos faltantes

- Una hora que falta o viene incompleta (temperatura, humedad o lluvia vacías o no numéricas) **corta la racha**, porque no se puede probar que estuvo húmeda.
- Si el día evaluado tiene menos de 18 horas completas, la función devuelve `nivel: null` e `indice: null`, y el motivo lo dice. Nunca inventa un nivel. Quien la llame (el cron) conserva el último semáforo con `stale: true` (CAFG-160).
- Una hora repetida cuenta una sola vez (gana la última). El orden de las horas no importa. Se ignoran las horas de días distintos al evaluado y su día anterior.

## 3. Parámetros (`PARAMETROS_RIESGO`)

| Parámetro | Valor | De dónde viene | Estado |
|---|---|---|---|
| `temperaturaMin` / `temperaturaMax` | 22 y 25 °C | Plan del frente (HU-19). No está en el artículo de Magarey | Supuesto a validar |
| `humedadMin` | 90 % (estrictamente mayor) | Plan del frente | Supuesto a validar |
| `lluviaDiariaMax` | 10 mm (este valor ya cuenta) | Plan del frente. No está en el artículo | Supuesto a validar |
| `aplicarReglaLluvia` | `true` | Decisión nuestra, para comparar con y sin la regla (CAFG-161) | Supuesto a validar |
| `horasParaIndiceMaximo` | 12 horas | **Construcción nuestra** | Supuesto a validar |
| `corteFavorable` / `corteMuyFavorable` | 0.5 y 0.75 | Producto de SENAMHI, no el artículo | Supuesto a validar |
| `horasMinimasConDato` | 18 horas | Decisión nuestra | Supuesto a validar |

## 4. Qué viene del artículo y qué es nuestro

Se leyó el artículo completo (Magarey, Sutton y Thayer 2005, *Phytopathology* 95:92-100).

**Del artículo (solo la idea de fondo):**
- La infección necesita un mínimo de horas de hoja mojada. En las cinco *Puccinia* de la Tabla 2, ese mínimo (Wmin) va de 5 a 6 horas.
- El mojado debe ser continuo: algunas *Puccinia* son sensibles a que la hoja se seque unas horas (Tabla 3 y texto).

**No está en el artículo:**
- La roya del café (*Hemileia vastatrix*): no aparece.
- Un índice de 0 a 1 y los cortes 0.5 y 0.75 (son de SENAMHI).
- El rango de 22 a 25 °C, la humedad de 90 % y la regla de lluvia.

**Construcción nuestra:**
- Estimar la hoja húmeda con humedad alta o lluvia. Es una estimación, no una medición.
- La escala `racha / 12`: que 12 horas den índice 1 es una decisión nuestra. Que 6 horas den justo 0.5 es una coincidencia buscada con el mínimo de 6 horas, no un resultado del artículo.
- Aplicar los cortes de SENAMHI a esta escala, que no es la de SENAMHI.
- No sumar interrupciones secas cortas (el artículo las llama D50, y no hay valor conocido para la roya del café).

## 5. Motivos

Siempre una sola frase, en presente (el día evaluado puede ser un pronóstico), sin "hoy", sin "probabilidad", sin "diagnóstico", y sin afirmar que la hoja está mojada: dice "hoja húmeda (estimada)".

| Caso | Texto |
|---|---|
| Sin datos | Faltan datos de clima para calcular el semáforo de este día. |
| Mucha lluvia | Mucha lluvia (21.7 mm): con 10 mm o más el semáforo no marca este día como favorable. |
| Poco favorable | El clima ayuda poco a que la roya avance: solo 5 horas seguidas de hoja húmeda (estimada) con 22 a 25 °C, y hacen falta al menos 6 horas. |
| Favorable | El clima ayuda a que la roya avance: 8 horas seguidas de hoja húmeda (estimada) con 22 a 25 °C y 5.4 mm de lluvia. |
| Muy favorable | El clima ayuda mucho a que la roya avance: 11 horas seguidas de hoja húmeda (estimada) con 22 a 25 °C y 2.4 mm de lluvia. |

Si la racha es 0, el texto de poco favorable dice "no hay horas seguidas de hoja húmeda (estimada) con 22 a 25 °C". Con una sola hora dice "solo 1 hora seguida".

## 6. Evidencia: 14 días reales de Saposoa

Datos de Open-Meteo para -6.935036, -76.770951, **del 25-oct al 7-nov-2026** (336 horas, 0 sin dato), bajados el 8-nov-2026. La ventana de 14 días se mueve cada día, así que no coincide con la corrida de HU-19 (19-oct al 1-nov).

| Día | Racha (h) | Lluvia (mm) | B con lluvia | B sin lluvia | A (*P. psidii*, tal cual) |
|---|---|---|---|---|---|
| 25-oct | 5 | 0.9 | 0.42 poco | 0.42 poco | 1.00 |
| 26-oct | 7 | 1.5 | 0.58 favorable | 0.58 favorable | 1.00 |
| 27-oct | 6 | 21.7 | **0.00 poco** | 0.50 favorable | 1.00 |
| 28-oct | 12 | 12.5 | **0.00 poco** | 1.00 muy | 1.00 |
| 29-oct | 12 | 13.7 | **0.00 poco** | 1.00 muy | 1.00 |
| 30-oct | 13 | 7.0 | 1.00 muy | 1.00 muy | 1.00 |
| 31-oct | 8 | 7.8 | 0.67 favorable | 0.67 favorable | 1.00 |
| 1-nov | 11 | 2.4 | 0.92 muy | 0.92 muy | 1.00 |
| 2-nov | 7 | 3.7 | 0.58 favorable | 0.58 favorable | 1.00 |
| 3-nov | 8 | 5.4 | 0.67 favorable | 0.67 favorable | 1.00 |
| 4-nov | 8 | 0.6 | 0.67 favorable | 0.67 favorable | 1.00 |
| 5-nov | 7 | 8.9 | 0.58 favorable | 0.58 favorable | 1.00 |
| 6-nov | 11 | 7.9 | 0.92 muy | 0.92 muy | 1.00 |
| 7-nov | 14 | 0.4 | 1.00 muy | 1.00 muy | 1.00 |

Días por nivel:

| Regla | poco | favorable | muy |
|---|---|---|---|
| **B con lluvia ≥ 10 mm = 0 (elegida)** | 4 | 6 | 4 |
| B sin regla de lluvia | 1 | 7 | 6 |
| A con *Puccinia psidii*, tal cual | 0 | 0 | 14 |
| A con *Phakopsora pachyrhizi*, tal cual | 0 | 0 | 14 |
| A con *P. psidii* y el requisito de horas al doble (prueba nuestra) | 0 | 2 | 12 |
| A con *P. pachyrhizi* y el requisito al doble (prueba nuestra) | 1 | 3 | 10 |

Lecturas:

- **B con lluvia** mantiene el criterio de HU-19: los días favorables o muy favorables (10 de 14) son los que tienen racha de 6 horas o más y menos de 10 mm de lluvia.
- Aun así, 10 de 14 días en favorable o más sigue siendo alto. El semáforo no es una señal fuerte mientras la hoja húmeda se estime con humedad mayor que 90 %.
- **3 de los 4 días "poco favorable" de B salen de la regla de lluvia**, que no está en el artículo. Sin ella, 13 de 14 días quedan en favorable o más.

### Por qué se descartó la Regla A

La Regla A seguía el modelo del artículo: `W(T) = Wmin / f(T)` con tope `Wmax` (ecuación 1) y `f(T)` de Yin (ecuación 2), con `T` igual a la temperatura media de la racha húmeda. El índice era las horas húmedas seguidas del día divididas entre `W(T)`, con tope 1. Se probó con dos royas de la Tabla 2 (ninguna es de roya del café):

| Roya (Tabla 2) | Tmin | Topt | Tmax | Wmin | Wmax |
|---|---|---|---|---|---|
| *Puccinia psidii* (eucalipto) | 1 | 21.5 | 30 | 6 | 24 |
| *Phakopsora pachyrhizi* (soya) | 10 | 23 | 28 | 8 | 12 |

**Satura: los 14 días de 14 caen en `muy_favorable`.** Con la hoja húmeda estimada (de 10 a 24 horas por día) y un `W(T)` de entre 6.5 y 14.8 horas, todos los días alcanzan el máximo. No distingue unos días de otros. El problema no es solo la regla: lo que no discrimina es la estimación de hoja húmeda con humedad mayor que 90 %.

### Cómo se calculó

Los scripts de análisis (descarga por hora, Regla A y comparación) no van al repo. La Regla B es el código de `lib/risk`. La tabla se puede reproducir con `scripts/semaforo/clima-saposoa.mjs` (rachas y lluvia por día) más la fórmula de la sección 2.

## 7. Advertencias

- **La escala `racha / 12` es construcción nuestra.** No viene del artículo ni de SENAMHI. Cambiar 12 por otro valor mueve los niveles.
- **La lluvia con índice 0 puede ser contraintuitiva:** la lluvia moja la hoja y, aun así, el día queda en `poco_favorable`. Es un supuesto heredado de HU-19, sin respaldo en el artículo. Se valida contra SENAMHI, comparando con y sin la regla (CAFG-161, parámetro `aplicarReglaLluvia`).
- La hoja húmeda es una estimación de modelo, no una medición. El clima es una estimación de unos 9 km, no una medición en la parcela.
- SENAMHI publica su índice como producto experimental. El semáforo es una guía, no un diagnóstico.

## 8. Equivalencia de colores

El color lo decide la pantalla, no la función.

| `nivel` | Color |
|---|---|
| `poco_favorable` | Verde |
| `favorable` | Amarillo |
| `muy_favorable` | Rojo |

"Muy favorable" suena a buena noticia para el caficultor, pero aquí significa que el clima ayuda mucho a la roya. La pantalla no debería mostrar ese texto tal cual: conviene mostrar el color y el `motivo`.

## 9. Cómo lo usarán otras historias

- **CAFG-111 (descarga de clima):** agrupa las zonas activas por coordenadas (`latitud`, `longitud`), baja el clima por hora una sola vez por punto y llama a `calcularRiesgo` por zona con las horas del día anterior y del día evaluado. **Pendiente:** decidir si se evalúa el día de hoy (con horas de pronóstico) o el de ayer completo. Si el resultado trae `nivel: null`, no escribe un semáforo nuevo y conserva el último (CAFG-160). Guarda `nivel`, `indice` y `motivo` por zona y fecha.
- **CAFG-113 (ver mi zona):** lee lo guardado. `/api/risk` traduce `nivel` a `level` e `indice` a `index`, como en el contrato de `architecture.md`. La pantalla elige el color y muestra el `motivo` junto al aviso de que es una estimación de unos 9 km.
- **CAFG-115 (aviso push):** avisa solo cuando el nivel sube, en el orden `poco_favorable` < `favorable` < `muy_favorable`. Un resultado con `nivel: null` no avisa.

## 10. Pendientes

| Tema | Quién | Estado |
|---|---|---|
| Contrastar con el índice de SENAMHI, con y sin la regla de lluvia | Frente Semáforo y avisos (CAFG-161) | Pendiente |
| Mejorar la estimación de hoja húmeda (hoy humedad mayor que 90 % o lluvia) | Frente Semáforo y avisos | Pendiente |
| Qué día se evalúa en el cron (hoy con pronóstico o ayer completo) | CAFG-111 | Pendiente |
| Duplicación entre `scripts/semaforo/clima-saposoa.mjs` y `lib/risk` | Frente Semáforo y avisos | Pendiente |
