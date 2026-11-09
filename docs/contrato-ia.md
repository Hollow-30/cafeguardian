# CAFG-105 — Contrato y simulador de clasificación

## Acuerdo de integración

El contrato se mantiene para frontend y backend, según lo confirmado por el usuario con el equipo. Solo existen dos clases: `healthy` (sana) y `rust` (roya). Las referencias a ojo de gallo en Jira están desactualizadas. «No concluyente» es una presentación de baja confianza, no una tercera clase del modelo.

## Entrada y respuesta

La aplicación consume `classifyLeaf(blob): Promise<Classification>`. La entrada es un `Blob` no vacío, JPEG, PNG o WebP, de hasta 10 MiB. La validación local comprueba tamaño y MIME declarado. El servicio real de CAFG-107 también comprueba el formato efectivo y decodifica estrictamente la imagen; esto no demuestra que contenga una hoja ni evalúa su calidad agronómica.

```json
{ "label": "healthy", "confidence": 88, "isDemo": true }
```

| Campo | Regla |
|---|---|
| `label` | `healthy` o `rust`; nunca nombres traducidos ni índices numéricos. |
| `confidence` | Número finito entre 0 y 100, incluidos los extremos; admite decimales. |
| `isDemo` | Booleano obligatorio: `true` para simulación y `false` para inferencia real. |

`parseClassification` valida las respuestas en tiempo de ejecución. Los errores de entrada, respuesta o proveedor rechazan la promesa; no se fabrican resultados ni se sustituye una falla del servicio real por una simulación silenciosa. `PhotoPicker` conserva su manejo de errores actual.

## Simulación y sustitución

`createMockProvider()` es local, determinista y no realiza peticiones de red. Sus cifras son ficticias, independientes del umbral de presentación:

| Escenario | Clase | Confianza |
|---|---|---|
| `healthy` (predeterminado) | `healthy` | 88 % |
| `rust` | `rust` | 92 % |
| `healthy-low-confidence` | `healthy` | 55 % |
| `rust-low-confidence` | `rust` | 55 % |

```ts
const classify = createLeafClassifier(createMockProvider("rust-low-confidence"))
const result = await classify(blob)
```

CAFG-107 conecta el proveedor HTTP real con la misma interfaz y cambia la composición de `classifyLeaf`. El simulador queda para uso explícito en pruebas. El checkpoint documenta `Roya: 0` y `Sanas: 1`; el servicio los mapea a `rust` y `healthy`, y convierte probabilidades de 0–1 a porcentajes. La app consume `POST /api/diagnostico`, que exige sesión y llama al servicio Python `POST /predict` con una credencial de servidor. La respuesta real exige `isDemo: false`; no hay sustitución por simulación ante errores. El alojamiento sigue pendiente de decisión del equipo. Ver [servicio de predicción](servicio-prediccion.md) para configuración, límites, tiempos y validación local.

## Confianza provisional

Se conserva el umbral del 60 %: por debajo se muestra «No concluyente»; en 60 % o más, la clase recibida. La etiqueta del contrato permanece sana o roya aun con confianza baja. El umbral está aceptado temporalmente por el equipo, pendiente de justificar con el conjunto de validación. Confianza y exactitud del modelo son conceptos distintos.

## Procedencia de los diagnósticos

Los nuevos registros locales conservan `isDemo` al guardar y lo muestran en historial, detalle y resumen compartido. `offline`/`synced` describe sincronización, no procedencia. Los registros antiguos sin `isDemo` muestran «Origen del diagnóstico no verificado»; no se asumen reales ni se modifica su contenido. No hace falta cambiar la versión de IndexedDB porque no se añaden índices ni almacenes.

Para la integración futura con backend, conservar este booleano de extremo a extremo. El servidor debe asignarlo desde el proveedor configurado, no confiar en el valor enviado por el cliente. Excluir `isDemo: true` y registros sin procedencia de métricas del modelo real. No se modifican la API de fotos ni el esquema de Supabase en esta HU; su persistencia remota de procedencia queda como trabajo de integración a coordinar con Jorge.

## Verificación

Ejecutar `pnpm test` y `pnpm exec tsc --noEmit --incremental false`; comprobar además `pnpm build`. Las pruebas cubren clases, rangos, errores, escenarios reproducibles, sustitución del proveedor, conservación de procedencia y compatibilidad del flujo de foto. Revisores propuestos: Gabriel para frontend y Jorge para el acuerdo de persistencia remota, sujetos a verificar elegibilidad y obtener autorización antes de asignarlos.

Validación realizada en CAFG-105:

- 60 pruebas específicas aprobadas en 7 archivos.
- Suite completa: 111 pruebas aprobadas en 19 archivos.
- Compilación de producción de Next.js aprobada. La configuración existente omite la validación de tipos durante el build.
- La validación independiente de TypeScript falla por TS5097 en `lib/auth/superadmin-provision.ts` y `scripts/create-superadmin.ts`, y TS1378 en este último. Son archivos sin cambios en esta HU: imports con extensión `.ts` y `await` de nivel superior incompatibles con las opciones actuales del proyecto.
- `git diff --check` sin errores.

Se ejecutaron los binarios locales de Vitest, TypeScript y Next.js tras instalar el lockfile con `npm exec --yes --package=pnpm@12.3.4 -- pnpm install --frozen-lockfile`: el lanzador de Corepack disponible tenía una instalación incompleta. No se modificaron las versiones ni el lockfile.
