# Descarga automática de clima y semáforo diario (CAFG-111, HU-20)

Responsable: Frente Semáforo y avisos.

Cada día una tarea programada baja el clima de Open-Meteo, lo guarda con su fecha y fuente, calcula el semáforo de cada zona con [`calcularRiesgo`](calculo-riesgo.md) y lo guarda. Si algo falla, **se conserva el último dato** y el fallo queda anotado. El semáforo mide qué tan favorable es el clima para que la roya avance; no es una probabilidad ni un diagnóstico.

## Qué se creó

| Pieza | Qué hace |
|---|---|
| `supabase/migrations/20261111_clima_riesgo_cron.sql` | Tablas `clima_diario`, `riesgo_diario` y `cron_runs`, con RLS |
| `lib/weather/open-meteo.ts` | Arma la petición a Open-Meteo y convierte la respuesta en `HoraClima[]` |
| `lib/weather/agrupar-zonas.ts` | Agrupa las zonas activas por coordenadas: una descarga por punto |
| `lib/cron/ejecutar-corrida.ts` | Orquesta la corrida (no sabe nada de red ni de Supabase: recibe todo por parámetro) |
| `lib/cron/almacen-supabase.ts` | Lee y escribe en Supabase |
| `lib/cron/autorizacion.ts` | Revisa el `CRON_SECRET` |
| `lib/cron/fecha-lima.ts` | Fecha de hoy en Lima |
| `app/api/cron/risk/route.ts` | Ruta `GET /api/cron/risk` que llama Vercel |
| `vercel.json` | Programa la ruta a las 11:00 UTC |

Tablas y RLS: ver [`docs/modelo-datos.md`](../modelo-datos.md).

## Cómo funciona una corrida

1. Calcula la fecha de hoy **en Lima**.
2. Lee las zonas con `activo = true` y las agrupa por coordenadas (a 6 decimales).
   - **Hoy las tres zonas activas (Saposoa, Alto Saposoa y Baja Saposoa) comparten un solo punto**, así que se hace **una sola descarga** y el resultado se guarda para las tres.
3. Crea una fila en `cron_runs` con estado `en_curso`, **antes** de descargar. Si no puede (por ejemplo, la migración no está aplicada), la corrida se detiene: no descarga ni escribe nada más.
4. Cierra las corridas interrumpidas (ver abajo).
5. Por cada punto, con su propio `try/catch`:
   - descarga 48 horas (ayer y hoy) de Open-Meteo, con tiempo límite de 20 s;
   - las guarda en `clima_diario` con `fuente` y `descargado_en`;
   - calcula el semáforo una vez y lo guarda en `riesgo_diario` para cada zona del punto.
6. Cierra la fila de `cron_runs` con `fin`, el estado y cuántas zonas salieron bien o con error.

Todo se guarda con `upsert` (inserta, o actualiza si ya existe esa clave): **repetir la corrida el mismo día no duplica nada**. Esto importa porque Vercel puede llamar dos veces al mismo cron. Lo único que suma filas es `cron_runs`, una por corrida.

## Cómo se marca un fallo (y qué dato se conserva)

El criterio de Jira dice "si falla, conserva el último dato y lo marca":

- **Conserva:** un punto que falla (Open-Meteo caído, respuesta rara, error al guardar) simplemente **no escribe nada**. Quedan las filas anteriores de `clima_diario` y `riesgo_diario`; nada se borra ni se pisa.
- **Marca:** el fallo queda en `cron_runs`: `estado` (`ok`, `parcial` o `error`), `zonas_con_error` y `detalle` con lo que pasó en cada punto (`ok`, `sin_datos` o `error` con un mensaje corto, sin secretos).
- **`nivel: null`:** si el clima tiene datos insuficientes (menos de 18 horas del día), `calcularRiesgo` devuelve `nivel: null`. Entonces se guarda el clima, **no** se escribe riesgo y la zona cuenta como zona con error (`sin_datos`).
- Que una zona esté "vencida" (su último semáforo no es de hoy) se deduce comparando la fecha de su última fila en `riesgo_diario` con hoy. Eso lo usan CAFG-160 y la pantalla (CAFG-113); aquí no hay una columna aparte.

Estado de la corrida: `ok` si todas las zonas se actualizaron, `parcial` si algunas sí y otras no, `error` si ninguna. La ruta responde 200 en `ok` y `parcial`, y 500 en `error`.

## Corridas interrumpidas

Si la función de Vercel se corta a mitad de camino (por tiempo o por un error), su fila de `cron_runs` quedaría para siempre en `en_curso`. Para evitarlo, en cada corrida, **después de crear su propia fila**, se cierran como `error` (con `detalle: {"motivo": "interrumpida"}`) las filas que cumplan las tres condiciones a la vez:

- están en `en_curso`;
- empezaron hace **más de 10 minutos**;
- su `id` es **distinto** al de la corrida actual (una corrida nunca se cierra a sí misma).

Una corrida que empezó hace 1 minuto no se toca (puede estar corriendo de verdad). Si este cierre falla, **no detiene la corrida**: se anota en el `detalle` (`cierre_interrumpidas_fallo`) y sigue. El umbral de 10 minutos es un supuesto a validar.

## Zona horaria

- Lima es UTC−5 todo el año (sin horario de verano).
- El cron corre a las 11:00 UTC (06:00 en Lima), el mismo día calendario en ambos.
- Open-Meteo se pide con `timezone=America/Lima`, `past_days=1` y `forecast_days=1`: devuelve las horas locales como `"AAAA-MM-DDTHH:00"`, el mismo formato que usa `calcularRiesgo`, sin conversiones.
- `fechaEnLima(ahora)` calcula la fecha de Lima; es la única función que depende del reloj y recibe la hora como parámetro, por eso se prueba con instantes fijos.

## Variables de entorno (solo nombres)

| Variable | Para qué | Si falta |
|---|---|---|
| `CRON_SECRET` | Autoriza la llamada de Vercel | 401, no se hace nada |
| `NEXT_PUBLIC_SUPABASE_URL` (o `SUPABASE_URL`) | Dirección de Supabase | 500 "Configuración incompleta", no se escribe nada |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servidor para escribir | 500 igual que arriba |

La ruta **falla cerrada**: sin `CRON_SECRET`, o con un encabezado distinto de `Bearer <CRON_SECRET>`, responde 401 antes de crear ningún cliente o llamar a la red. La comparación se hace en tiempo constante. Si la migración no está aplicada, crear la fila de `cron_runs` falla: 500 y no se descarga nada. Nunca se escriben valores de secretos en el repositorio ni en los mensajes.

## Orden de despliegue

1. Revisar y aprobar el PR (todavía sin merge).
2. Alguien con credenciales aplica **solo** la migración `20261111_clima_riesgo_cron.sql` en la base compartida (no el seed completo) y corre las consultas de comprobación de `docs/modelo-datos.md`.
3. En Vercel (Production), `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya existen. **Solo falta cargar `CRON_SECRET`**: texto aleatorio de 16 caracteres o más, solo letras y números. Lo hace el dueño de la cuenta.
4. Merge a `main`: el despliegue registra el cron desde `vercel.json`. Si `CRON_SECRET` se cargó después del despliegue, hay que volver a desplegar (un cambio de valor solo rige en un deploy nuevo).
5. Verificar mirando `cron_runs` después de la primera corrida, o llamando a la ruta a mano con el secreto (lo hace quien tenga el valor).

Si se hace el merge antes de aplicar la migración, la primera corrida responde 500 sin escribir nada: es seguro, pero se pierde ese día.

## Límites de Vercel (plan Hobby)

- Un cron por día como máximo; la hora tiene una precisión de ±59 minutos (el de las 11:00 UTC corre entre 06:00 y 06:59 en Lima).
- Solo corre en producción, no en previews. No reintenta si falla. No sigue redirecciones.
- Puede llamar dos veces a la misma corrida (por eso todo es `upsert`).
- Las funciones duran como máximo 300 s en Hobby; la ruta declara `maxDuration = 60`.
- La documentación de Vercel llama "legacy" a esta función y anuncia su migración a Schedules, sin fecha. Habrá que revisarlo más adelante.

## Cómo probar a mano

- Las pruebas automáticas no usan red ni credenciales: `pnpm test`.
- Contra producción, quien tenga el secreto puede llamar a `GET /api/cron/risk` con el encabezado `Authorization: Bearer <CRON_SECRET>` y revisar `cron_runs`. No se prueba contra la base real desde el repositorio.

## Supuestos a validar

- **Se evalúa "hoy en Lima"** con horas de pronóstico: a las 06:00, las horas 06 a 23 son pronóstico, no observación. Esto resuelve el pendiente de [`calculo-riesgo.md`](calculo-riesgo.md) §10.
- Tiempo límite de 20 s por descarga y `maxDuration = 60`.
- Umbral de 10 minutos para dar una corrida por interrumpida.
- Open-Meteo puede limitar por IP en hosts compartidos como Vercel (con 1 descarga al día es poco probable).

## Fuente y licencia

- Open-Meteo es **gratis solo para uso no comercial**: vale para este MVP académico. Si el proyecto pasara a uso comercial habría que pasar a un plan de pago u otra fuente.
- Sus datos son CC BY 4.0: **hay que dar crédito con un enlace junto al lugar donde se muestre el dato** (por ejemplo, "Weather data by Open-Meteo.com"). **Pendiente para CAFG-113**, que es la pantalla que muestra el semáforo.
