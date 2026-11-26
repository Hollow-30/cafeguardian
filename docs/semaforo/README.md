# Frente Semáforo y avisos (CAFG-157)

Responsable: Frente Semáforo y avisos. Este es el punto de entrada: dice qué hace el frente, dónde está cada pieza, cómo probarlo y qué documento leer para cada tema.

## Qué hace el frente

- **Semáforo de roya por zona.** Cada día se baja el clima de la zona, se calcula qué tan favorable es para que la roya del café avance y se guarda un nivel con su motivo: **poco favorable** (verde), **favorable** (amarillo) y **muy favorable** (rojo).
- **Pantalla `/semaforo`.** El caficultor elige su zona y ve el nivel (con texto, color e icono distinto), qué hacer, la fecha del dato y el aviso de que es una estimación de unos 9 km.
- **Aviso en la app.** Al abrir la app, el inicio del caficultor muestra un recordatorio del semáforo (franja verde, bloque amarillo o bloque rojo; o una invitación si aún no eligió zona) que se puede cerrar por el resto del día. El menú del caficultor tiene la entrada «Semáforo».

El semáforo **no es una probabilidad de tener roya ni un diagnóstico**: mide qué tan favorable es el clima para la infección. Es una **estimación de la zona (unos 9 km a la redonda)**, no una medición de la parcela. El aviso es un **recordatorio al abrir la app**; el aviso push real (que llegue con la app cerrada) es una mejora posterior y no está entregado.

## Mapa de archivos

| Dónde | Qué hace |
|---|---|
| `lib/risk/` | Cálculo del semáforo: `calcular-riesgo.ts` (función pura), `params.ts` (parámetros), `motivo.ts` (frase del motivo), `types.ts` |
| `lib/weather/` | `open-meteo.ts` (petición y lectura de la respuesta) y `agrupar-zonas.ts` (una descarga por punto) |
| `lib/cron/` | La corrida diaria: `ejecutar-corrida.ts` (orquesta), `almacen-supabase.ts` (lee y escribe), `autorizacion.ts` (`CRON_SECRET`), `fecha-lima.ts` |
| `app/api/cron/risk/route.ts` | `GET /api/cron/risk`, la llama Vercel Cron |
| `vercel.json` | Programa la ruta a las 11:00 UTC (06:00 en Lima) |
| `lib/semaforo/leer.ts` | Lee perfil, zona y última fila de `riesgo_diario` con la sesión del usuario (RLS) |
| `lib/semaforo/estado.ts` | Decide el estado de la pantalla (`sin_zona`, `zona_sin_dato`, `dato_de_hoy`, `dato_vencido`, `error_lectura`, `cargando`) |
| `lib/semaforo/presentacion.ts` | **Único lugar** de etiquetas, textos, colores y fechas legibles |
| `lib/semaforo/aviso.ts` | `decidirAviso`: qué muestra el aviso del inicio y la clave de cierre por día |
| `lib/semaforo/zonas.ts`, `lib/semaforo/types.ts` | Lectura de zonas activas y tipos |
| `app/semaforo/` | Página `/semaforo` y su `loading.tsx` |
| `app/api/perfil/zona/route.ts` | `PATCH /api/perfil/zona`: guarda la zona del usuario |
| `components/semaforo-card.tsx` | Tarjeta del semáforo |
| `components/aviso-semaforo.tsx` | Aviso del inicio (componente cliente, con la X) |
| `components/zona-selector.tsx`, `components/cambiar-zona.tsx` | Elegir y cambiar de zona |
| `supabase/migrations/20261107_zonas_clima.sql` | Catálogo de zonas con coordenadas |
| `supabase/migrations/20261111_clima_riesgo_cron.sql` | `clima_diario`, `riesgo_diario` y `cron_runs` |
| `supabase/migrations/20261112_profiles_zona_clima.sql` | `profiles.zona_clima_id` y su trigger |
| `docs/semaforo/` | Esta documentación |

Archivos que se usan pero son de otro frente (se tocan con aviso): `content/navigation.ts` y `components/app-navigation.tsx` (menú), `components/farmer-home.tsx` y `app/page.tsx` (inicio), `lib/auth/roles.ts` y `proxy.ts` (rutas con sesión).

## Cómo correr y probar

```powershell
pnpm install
pnpm dev
```

`pnpm dev` levanta la app en <http://localhost:3000>.

```powershell
pnpm vitest run
```

Corre todas las pruebas (es lo mismo que `pnpm test`, y es lo que corre CI en cada PR).

```powershell
npx tsc --noEmit
```

Revisa los tipos. **CI no lo corre**, así que conviene correrlo antes de cada PR. Si falla con una ruta dentro de `.next/dev/types/`, son tipos generados viejos de una página que ya no existe: con `pnpm dev` detenido, borrar la carpeta `.next/dev` y volver a correrlo.

```powershell
node --test scripts/semaforo/clima-saposoa.test.mjs
```

Prueba del script de análisis de clima; va aparte y no corre en CI.

`pnpm db:migrate` y `pnpm db:seed` necesitan credenciales y apuntan a la base compartida: **no se corren a ciegas** (ver «Cuentas de prueba»). Claude Code no los ejecuta.

## Cómo funciona el cálculo diario

1. Vercel Cron llama a `GET /api/cron/risk` a las **11:00 UTC (alrededor de las 06:00 de Lima)**. En el plan Hobby la hora tiene una precisión de ±59 minutos.
2. La ruta exige el encabezado `Authorization: Bearer <CRON_SECRET>`; sin él responde 401 y no hace nada.
3. Lee las zonas activas de `zonas_clima` y las **agrupa por coordenadas**: una descarga por punto.
4. Crea una fila en `cron_runs` (`en_curso`) antes de descargar.
5. Por cada punto baja 48 horas de Open-Meteo y las guarda en **`clima_diario`**, con su fuente y la fecha de descarga.
6. Calcula el semáforo con `calcularRiesgo` y lo guarda en **`riesgo_diario`** (nivel, índice, motivo, detalle y `calculado_en`) para cada zona del punto.
7. Cierra la fila de **`cron_runs`** con el estado (`ok`, `parcial` o `error`) y cuántas zonas salieron bien o con error.

Todo se guarda con `upsert`: repetir la corrida el mismo día no duplica nada. **Si algo falla, no se escribe nada de ese punto: se conserva el último dato** y el fallo queda en `cron_runs`. La pantalla deduce que un dato está vencido comparando su fecha con el día de Lima. Detalle en [`descarga-clima.md`](descarga-clima.md) y [`calculo-riesgo.md`](calculo-riesgo.md); tablas y políticas RLS en [`../modelo-datos.md`](../modelo-datos.md).

## Variables de entorno (solo nombres)

Nunca se escriben valores en el repositorio, en documentos ni en chats. Los valores los guarda el equipo fuera del repo (`.env.local` para la app, `.env` para los scripts de base de datos, y las variables del proyecto en Vercel).

| Variable | Para qué | Si falta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` (o `SUPABASE_URL`) | Dirección de Supabase | La app y el cron no pueden conectarse |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública para la sesión del usuario (pantalla y aviso, con RLS) | La app no puede leer con la sesión del usuario |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servidor, solo para que el cron escriba | El cron responde 500 sin escribir nada |
| `CRON_SECRET` | Autoriza la llamada de Vercel al cron | El cron responde 401 |
| `POSTGRES_URL_NON_POOLING` | Solo para `pnpm db:migrate` y `pnpm db:seed` | Esos scripts no corren |
| `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_PROMOTE` | Solo para `pnpm superadmin:create` (ver «Cuentas de prueba») | El script se detiene con un mensaje |

Las variables de servidor no llevan el prefijo `NEXT_PUBLIC_`.

## Cuentas de prueba

Para probar el frente a mano hacen falta cuentas de estos tipos. **Las credenciales las guarda el equipo FUERA del repositorio**; aquí no hay contraseñas ni correos reales.

| Cuenta | Para qué sirve | Cómo se obtiene |
|---|---|---|
| Caficultor **sin zona** | Ver la invitación «Elige tu zona…» en el inicio y el selector en `/semaforo` | Crear una cuenta nueva desde el registro de la app; una cuenta nueva no tiene zona elegida |
| Caficultor **con zona Saposoa** | Ver el aviso y la tarjeta con el dato real del día | Entrar con una cuenta de caficultor y elegir «Saposoa» en `/semaforo` |
| Caficultor **con dato vencido** | Ver «Dato del …» con «Calculado hace X horas» y que el aviso no aparezca | **Pendiente de verificar a mano.** No se puede provocar sin escribir en `riesgo_diario`, que solo escribe el cron. Opciones: esperar a que el cron lleve más de un día sin actualizar la zona, o usar una página de vista previa temporal fuera de Git (que no se sube al repositorio) |
| **Superadministrador** | Comprobar que va a `/panel`, sin aviso ni «Semáforo» | Se crea con `pnpm superadmin:create`, que necesita `.env` con las credenciales de la base y variables propias del script; lo corre quien tenga esas credenciales (no Claude Code). El registro público nunca otorga este rol |

Notas:

- La base de Supabase es compartida y podría ser la de producción: **no se corre el seed completo** (`pnpm db:seed` inserta usuarios y datos de prueba).
- Con el semáforo de una zona no se puede forzar el nivel del día: depende del clima que bajó el cron.
- Las tres zonas activas (Saposoa, Alto Saposoa y Baja Saposoa) comparten un punto de clima, así que dan el mismo resultado.

## Documentos del frente

| Documento | Para qué |
|---|---|
| [`modelo-infeccion.md`](modelo-infeccion.md) | Modelo de infección, parámetros y fuente de clima (CAFG-110) |
| [`calculo-riesgo.md`](calculo-riesgo.md) | Regla del índice, niveles y motivos (CAFG-112) |
| [`descarga-clima.md`](descarga-clima.md) | Cron diario, tablas, fallos y despliegue (CAFG-111) |
| [`pantalla-semaforo.md`](pantalla-semaforo.md) | Pantalla `/semaforo`, estados y textos (CAFG-113) |
| [`aviso-en-app.md`](aviso-en-app.md) | Aviso del inicio y menú (CAFG-115) |
| [`guion-demostracion.md`](guion-demostracion.md) | Guion de la demostración (3 a 5 minutos) |
| [`pruebas-aceptacion.md`](pruebas-aceptacion.md) | Matriz de aceptación, errores conocidos y resumen (CAFG-153) |
| [`../modelo-datos.md`](../modelo-datos.md) | Tablas, RLS y migraciones |
| [`../ci-cd.md`](../ci-cd.md) | Pipeline de pruebas y despliegue |

## Estado

- **Hecho:** catálogo de zonas, cálculo con motivo, descarga diaria y cron, pantalla `/semaforo`, zona en el perfil, aviso en el inicio, entrada «Semáforo» para el caficultor y la línea «Calculado hace X horas» con el dato vencido.
- **No entregado:** el aviso push real (pedir permiso y avisar con la app cerrada, CAFG-114). Quedó como mejora posterior por decisión del equipo.
- **Pendiente:** validar el semáforo contra el índice de SENAMHI (CAFG-161), validar con un técnico (SENASA/INIA) los textos de «qué hacer», aviso de privacidad (CAFG-176), usar la ubicación (CAFG-177), y la comprobación visual en un teléfono real.
- Los supuestos y los límites conocidos están en [`pruebas-aceptacion.md`](pruebas-aceptacion.md).
