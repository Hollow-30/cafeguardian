# Pantalla "Ver semáforo de mi zona" (CAFG-113, HU-22)

Responsable: Frente Semáforo y avisos.

La pantalla muestra al caficultor el último semáforo calculado para **su zona** del catálogo `zonas_clima`. Está en `/semaforo` (CAFG-182 y CAFG-186). Usa la paleta `coffee-*` de Frontend para todo lo neutro; solo los colores del semáforo (verde, amarillo, rojo) son hexadecimales de `presentacion.ts`.

El semáforo mide qué tan favorable es el clima para que la roya avance. No es una probabilidad de tener roya ni un diagnóstico, y los textos no usan esas palabras.

## Qué hay hoy

| Pieza | Qué hace |
|---|---|
| `supabase/migrations/20261112_profiles_zona_clima.sql` | Agrega `profiles.zona_clima_id` (nullable, clave foránea a `zonas_clima`, `on delete set null`) y un trigger que rechaza zonas inactivas |
| `app/api/perfil/zona/route.ts` | `PATCH /api/perfil/zona`: guarda la zona elegida |
| `lib/semaforo/leer.ts` | Lee perfil, zona y última fila de `riesgo_diario` con la sesión del usuario |
| `lib/semaforo/estado.ts` | Decide en qué estado está la pantalla |
| `lib/semaforo/presentacion.ts` | **Único lugar** con etiquetas, textos (`TEXTOS_SEMAFORO`, `TEXTOS_ZONA`), colores y fechas legibles |
| `lib/semaforo/zonas.ts` | Lee las zonas activas (`zonas_clima`, `activo = true`, por nombre) con la sesión del usuario |
| `app/semaforo/page.tsx` | Página de servidor: sin sesión va a `/login?next=/semaforo`; lee, calcula el estado y muestra tarjeta o selector |
| `app/semaforo/loading.tsx` | Esqueleto con «Cargando el semáforo de tu zona…» |
| `components/semaforo-card.tsx` | Nivel (texto, color e icono distinto), barra del índice, qué hacer, motivo tal cual, fecha, nota de ayer, aviso de ~9 km y crédito de Open-Meteo |
| `components/zona-selector.tsx` | Lista de zonas activas; guarda con `PATCH /api/perfil/zona` y refresca la página; «Guardando…» y errores con `aria-live` |
| `components/cambiar-zona.tsx` | Enlace «Cambiar zona» que abre el selector y lo cierra al guardar |
| `lib/auth/roles.ts` y `proxy.ts` | `/semaforo` exige sesión (también se agregó al `matcher`) |

### Cómo se arma la página

- Sin zona (`sin_zona`): el selector es la llamada principal.
- Con zona: tarjeta y, debajo, «Cambiar zona».
- Si falla la lectura del semáforo o de la lista de zonas: estado `error_lectura` con «Volver a cargar».
- El estado `cargando` solo lo muestra `loading.tsx`.

### `PATCH /api/perfil/zona`

- Cuerpo: `{ "zona_clima_id": "<uuid>" }`.
- 401 sin sesión; 400 si el cuerpo no es JSON o el id no es un uuid; 422 si la zona no existe o está inactiva; 404 si el usuario no tiene perfil; 500 genérico (sin detalles internos) si falla la base.
- Escribe con la **sesión del usuario** (RLS), nunca con service role.
- Respuesta 200: `{ "zona_clima_id": "...", "zona": { "id": "...", "nombre": "..." } }`.
- Doble defensa: la ruta valida `activo = true` y el trigger de la base lo vuelve a exigir, porque `profiles_update_own` deja a un usuario saltarse la ruta y actualizar su perfil directamente.
- **Hueco documentado:** el trigger solo se evalúa al escribir `zona_clima_id`. Si una zona se desactiva después, quien ya la tenía la conserva y verá "sin dato".

## Estados

El estado sale de `estadoSemaforo({ lectura, ahora })` (función pura). "Hoy" es la fecha de Lima (`fechaEnLima`, la misma regla del cron).

| Estado | Cuándo | Texto principal |
|---|---|---|
| `cargando` | Todavía no hay lectura | "Cargando el semáforo de tu zona…" |
| `error_lectura` | Falló alguna lectura (incluye migración sin aplicar) | "No pudimos cargar el semáforo. Vuelve a intentar en unos minutos." |
| `sin_zona` | `profiles.zona_clima_id` es nulo | "Aún no elegiste tu zona." |
| `zona_sin_dato` | La zona no tiene filas en `riesgo_diario`, o la fila no se entiende (fecha o nivel inválidos) | "Todavía no hay estimación para la zona {nombre}." |
| `dato_de_hoy` | `fecha` es hoy o futura (reloj desfasado cuenta como hoy) | "Estimación del {fecha}" |
| `dato_de_hoy` con `esDeAyer` | `fecha` es ayer y en Lima son menos de las 12:00 | Igual, con la nota "El de hoy se calcula alrededor de las 6 a. m." |
| `dato_vencido` | `fecha` es ayer pasadas las 12:00, o anterior | "Dato del {fecha}" (con `diasAtraso`) |

La tolerancia de ayer existe porque el cron corre a las 06:00 de Lima con ±59 minutos: sin ella, la pantalla diría "vencido" todas las madrugadas. La hora límite es la constante `HORA_LIMITE_DATO_DE_AYER` (12).

## Textos y colores

| Nivel | Etiqueta | Color | Icono | Qué hacer |
|---|---|---|---|---|
| `poco_favorable` | Poco favorable | verde | `check` | Revisa tus hojas con tu rutina de siempre. |
| `favorable` | Favorable | amarillo | `alerta` | Revisa tus hojas esta semana. |
| `muy_favorable` | Muy favorable | rojo | `peligro` | Revisa tus hojas pronto. Si ves manchas amarillas o polvo anaranjado en el envés, consulta a un técnico. |

- Cada nivel lleva texto, color **e** icono distinto: nunca solo color. No se usa "Riesgo moderado".
- Los colores salen en hexadecimal (fondo, borde, texto y barra). Una prueba comprueba contraste de al menos 4.5:1 entre texto y fondo, y 3:1 para borde y barra.
- Texto fijo: "Estimación para la zona {nombre} (unos 9 km a la redonda). No es una medición de tu parcela."
- Crédito junto al dato: "Weather data by Open-Meteo.com" enlazado a <https://open-meteo.com/>, y "CC BY 4.0" enlazado a <https://creativecommons.org/licenses/by/4.0/>.
- El `motivo` se muestra **tal cual** viene de `riesgo_diario`.

## Qué datos se pueden mostrar

Del día: `nivel`, `indice` (0 a 1, para una barra de progreso), `motivo`, la fecha ("11 de noviembre", sin desfase de zona horaria) y la zona. Del `detalle` de `lib/risk`: `rachaMaxima`, `horasHojaHumeda` y `lluviaDia`.

**No hay temperatura ni humedad**: `riesgo_diario` no las trae y `clima_diario` solo la lee el Superadministrador. Si se quisieran mostrar, habría que guardar medias en el `detalle` de `lib/risk`; es una decisión pendiente de Piero y no se hizo.

## Orden de despliegue

La pantalla lee `profiles.zona_clima_id`; sin esa columna la lectura falla y se vería el estado de error. Por eso:

1. Revisar y aprobar el PR (sin merge todavía).
2. Que Piero aplique **solo** `20261112_profiles_zona_clima.sql` en la base compartida, después del visto bueno de Jorge (Backend), y corra las consultas de comprobación de `docs/modelo-datos.md`. La migración es idempotente y no asume nada del seed.
3. Merge a `main`.

Si se hace el merge antes de la migración, `PATCH /api/perfil/zona` responde 500 y la pantalla muestra el estado de error: es seguro (no escribe nada), pero inútil hasta aplicarla.

## Supuestos a validar

- Los tres textos de "qué hacer" y la frase de manchas y polvo (SENASA/INIA o un técnico).
- Las 12:00 de Lima como hora límite del dato de ayer.
- Los colores exactos y su contraste en un teléfono real a pleno sol.
- Las tres zonas activas (Saposoa, Alto Saposoa y Baja Saposoa) dan hoy el mismo resultado, porque comparten un solo punto de clima; probar el selector con ellas no demuestra diferencias reales.
- `riesgo_diario` la lee cualquier usuario con sesión (RLS): es un dato público de la zona, no del usuario.

## Qué falta

- Enlazar la pantalla desde la navegación (`content/navigation.ts`) y el inicio (`components/farmer-home.tsx`): lo hace Frontend (Gabriel).
- Aviso de privacidad (CAFG-176) y «usar mi ubicación actual» con GPS (CAFG-177).
- Comprobación visual en un teléfono real y validación de textos y colores.
