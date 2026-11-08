# CAFG-107 — Servicio de predicción

## Arquitectura y contrato

`PhotoPicker` → `classifyLeaf(blob)` → `POST /api/diagnostico` (Next.js) →
`POST /predict` (FastAPI/PyTorch CPU). La ruta Next exige una sesión Supabase
válida y añade la credencial del servicio desde variables exclusivas del servidor.
La imagen se envía como cuerpo binario, con `Content-Type: image/jpeg`,
`image/png` o `image/webp`; no se usa multipart ni base64.

La respuesta de ambas API contiene únicamente:

```json
{"label":"healthy","confidence":88.5,"isDemo":false}
```

Solo se admiten `healthy` y `rust`, confianza finita en [0, 100] e `isDemo: false`.
El checkpoint conserva `Roya: 0`, `Sanas: 1`; se usa softmax y se multiplica por
100. La confianza no está calibrada y no equivale a exactitud. El umbral de
presentación del 60 % permanece provisional, según CAFG-105.

El simulador sigue disponible para pruebas explícitas, pero ya no forma parte de
la composición predeterminada. Los errores no producen diagnósticos ficticios.
Los registros locales conservan `isDemo`; la persistencia remota de procedencia
continúa pendiente de coordinación con Backend, fuera de esta implementación.

## Modelo y validación

El servicio verifica el SHA-256 fijo del checkpoint contra CAFG-106, sus metadatos
y su state dict estricto. Carga ResNet18 una vez durante el arranque, sin descargar
pesos ni reentrenar. Usa CPU, `model.eval()` y `torch.inference_mode()`.
Un checkpoint ausente o alterado impide el arranque.

El preprocesamiento reproduce la evaluación: conversión RGB, resize directo a
224 × 224, tensor y normalización ImageNet (media 0.485/0.456/0.406; desviación
0.229/0.224/0.225). No hay aumentos ni rotación EXIF añadida.

Ambas API limitan la lectura efectiva a 10 MiB, aunque falte o sea falso
`Content-Length`. Python comprueba formato real contra MIME, `verify()` y carga
completa de píxeles con Pillow, con lectura de imágenes truncadas deshabilitada.
Rechaza imágenes vacías, corruptas, animadas o de más de 20 millones de píxeles.
Validar la imagen no demuestra que contenga una hoja de café: el modelo binario
actual no tiene detector de dominio, ni se añade uno en CAFG-107.

| Situación | Servicio Python | Ruta Next |
|---|---:|---:|
| Sin credencial / sesión | 401 | 401 |
| Longitud mal formada | 400 | 413 |
| Más de 10 MiB | 413 | 413 |
| MIME no permitido o distinto del formato real | 415 | 415 |
| Imagen vacía, corrupta, animada o demasiados píxeles | 422 | 422 |
| Recepción de imagen supera 15 s | 408 | 503 |
| Modelo ocupado o fallo de inferencia | 503 | 503 |
| Servicio sin configurar | — | 503 |
| Fallo de red o respuesta inválida/simulada | — | 502 |
| Recepción + llamada al servicio supera 30 s | — | 504 |

El navegador cancela a los 35 s. Next declara `maxDuration = 40`, sujeto a la
configuración efectiva del alojamiento. Python admite una inferencia a la vez
por proceso y responde 503 si ya está ocupado; no acumula una cola de inferencias.
Una desconexión de Next no interrumpe una inferencia CPU ya iniciada en Python.

## Ejecución local en Windows

Desde la raíz del repositorio, con Python 3.12:

```powershell
python -m venv ml/.venv
ml/.venv/Scripts/python.exe -m pip install torch==2.11.0 torchvision==0.26.0 --index-url https://download.pytorch.org/whl/cpu
ml/.venv/Scripts/python.exe -m pip install -r ml/service/requirements-test.txt
```

Configurar mediante el gestor de secretos del entorno:

| Variable | Dónde | Valor |
|---|---|---|
| `INFERENCE_SERVICE_TOKEN` | Next y Python | Mismo secreto aleatorio de al menos 32 caracteres |
| `INFERENCE_SERVICE_URL` | Solo Next | URL completa, por ejemplo `http://127.0.0.1:8000/predict` en local |
| `INFERENCE_CHECKPOINT` | Python, opcional | Ruta al mismo checkpoint verificado; por defecto el versionado en `ml/models/` |
| `INFERENCE_NUM_THREADS` | Python, opcional | Hilos de PyTorch, 1 por defecto; admite 1–8 |

No usar el prefijo `NEXT_PUBLIC_`. Next solo permite HTTP en loopback;
para destinos remotos exige HTTPS. Se rechazan credenciales embebidas, query
strings y fragmentos en la URL. No sigue redirecciones al enviar la credencial.
Nunca versionar el token ni registrar el cuerpo de la foto.

Con las variables cargadas en cada proceso:

```powershell
ml/.venv/Scripts/python.exe -m uvicorn ml.service.app:app --host 127.0.0.1 --port 8000 --workers 1 --limit-concurrency 16 --no-access-log
pnpm dev
```

`GET /healthz` devuelve `{"ready":true}` después de cargar y verificar el modelo.
No necesita token y no expone metadatos del modelo. No hay CORS habilitado: el
navegador consume la ruta de su propio origen, no el servicio Python directamente.
No se persisten las imágenes recibidas en disco ni en una base de datos.

## Contenedor y alojamiento

```powershell
docker build -f ml/service/Dockerfile -t cafeguardian-inference:cafg-107 .
ml/.venv/Scripts/python.exe -m ml.service.smoke --container
docker run --rm -p 127.0.0.1:8000:8000 --env INFERENCE_SERVICE_TOKEN cafeguardian-inference:cafg-107
```

La imagen usa Python 3.12, wheels CPU, un proceso y usuario sin privilegios.
El archivo `Dockerfile.dockerignore` limita el contexto a código del servicio,
validación del checkpoint y modelo; excluye `.env`, datos, entorno virtual y Git.

El proveedor de alojamiento sigue pendiente de decisión del equipo, como indica
Jira. Antes de integrar en producción hay que publicar el servicio, suministrar
URL y secreto a Next y verificar disponibilidad, HTTPS, memoria, concurrencia,
tiempos y límite efectivo de carga. Una plataforma con un límite inferior a
10 MiB rechazará la petición antes de llegar a esta ruta; el flujo actual
comprime la foto, pero eso no amplía el límite de la plataforma.

## Medición y pruebas

Python devuelve `X-Inference-Time-Ms` (decodificación, preprocesamiento e
inferencia; no incluye carga inicial del modelo) y `Server-Timing: total;dur=...`
(recepción y procesamiento hasta construir la respuesta). Next devuelve su
propia duración total en `Server-Timing`. Las duraciones están en milisegundos.
Uvicorn registra estado y duración mediante su logger, sin imagen, token ni
identificadores del usuario. No se altera el JSON del contrato.

```powershell
ml/.venv/Scripts/python.exe -m unittest discover -s ml/tests -v
pnpm test
ml/.venv/Scripts/python.exe -m ml.service.smoke
pnpm exec tsc --noEmit --incremental false
pnpm build
git diff --check
```

`smoke` inicia temporalmente Uvicorn en loopback, genera un secreto efímero y una
imagen sintética, y ejecuta una prueba de `classifyLeaf` → ruta Next → HTTP →
checkpoint real. Simula únicamente la sesión Supabase y el transporte del
navegador hacia la función de ruta Next; la llamada de Next a Python usa red
real. Al terminar detiene el servidor. No cambia archivos `.env` ni necesita
credenciales reales. La prueba `live.test.ts` se omite deliberadamente en la
suite ordinaria y se ejecuta con este comando.
La opción `--container` ejecuta la misma cadena contra la imagen Docker ya
construida y detiene su contenedor temporal al terminar.

## Validación realizada en CAFG-107

- Windows, Python 3.12.10, PyTorch 2.11.0+cpu, Torchvision 0.26.0+cpu,
  Pillow 13.0.0, NumPy 2.5.4, FastAPI 0.139.2, Uvicorn 0.51.0.
- 38 pruebas Python aprobadas: 19 de evaluación existente y 19 del servicio,
  incluyendo checkpoint real, mapeo, preprocesamiento, tres formatos y errores.
- 146 pruebas Vitest aprobadas; la prueba HTTP optativa pasó tanto contra
  Uvicorn local como contra la imagen Docker Linux.
- Inferencia real con imágenes sintéticas JPEG, PNG y WebP: 82.65, 48.92 y
  44.56 ms en una ejecución local con otras pruebas concurrentes. Son ejemplos
  de ejecución, no un benchmark de producción ni evidencia de exactitud.
- Build de Next.js aprobado. La configuración existente omite comprobar tipos.
- TypeScript continúa con los errores previos TS5097 y TS1378 en
  `lib/auth/superadmin-provision.ts` y `scripts/create-superadmin.ts`.
- `pip check` sin dependencias incompatibles y `git diff --check` sin errores.
- Imagen Docker construida y validada por HTTP usando el checkpoint real,
  el usuario sin privilegios y el comando de arranque de la imagen. El
  contenedor temporal se detuvo y eliminó al terminar la prueba.
- No se ha desplegado el servicio ni configurado producción; la validación con
  sesión real Supabase y el alojamiento final sigue pendiente.

Gabriel (`Hollow-30`) y Jorge (`jblobaca`) son reviewers propuestos por los
componentes frontend y backend/despliegue respectivamente. Se verificó acceso de
escritura al repositorio con GitHub CLI; su asignación requiere autorización.
