# Pruebas de aceptación del frente Semáforo y avisos (CAFG-153)

Responsable: Frente Semáforo y avisos. Este documento relaciona cada criterio de las historias de prioridad **Alta** del frente con la prueba automática que lo cubre (archivo y nombre de la prueba, tal como están en el repositorio), los pasos manuales que faltan, y lista los errores conocidos y los límites.

## Cómo leer las tablas

- **Cobertura automática:** *Completa* (las pruebas cubren lo esencial del criterio), *Parcial* (cubren una parte y falta otra) o *Ninguna*.
- **Prueba manual:** *Necesaria* (la automática no puede cerrar el criterio; falta comprobar a mano), *Recomendada* (la automática lo cubre, pero conviene verlo en pantalla o en un teléfono real) o *—*.
- **Resultado:** queda en **Pendiente** en todas las filas. Las pruebas manuales en producción las hará otra persona y se completarán después. La excepción es CAFG-114, que figura como **No entregado**.
- **Evidencia:** en blanco hasta que se haga la prueba manual (captura, fecha y quién la hizo).
- Las pruebas automáticas se corren con `pnpm vitest run`. Todas las pruebas citadas usan datos simulados: no tocan la base ni la red.

## a) Matriz de aceptación

### CAFG-111 · Descarga automática de clima

| Criterio | Cobertura automática | Pasos manuales | Resultado | Evidencia |
|---|---|---|---|---|
| Tarea programada diaria | **Parcial.** `app/api/cron/risk/route.test.ts` («401 sin encabezado, sin tocar la base ni la red», «camino feliz: descarga, guarda y responde con el contrato»); `lib/cron/fecha-lima.test.ts` («a las 11:00 UTC (hora del cron) es el mismo día»). La programación misma (`vercel.json`, `0 11 * * *`) no tiene prueba | **Necesaria.** En Vercel, comprobar que el cron está registrado; al día siguiente, revisar que `cron_runs` tiene una fila nueva con estado `ok` (solo la lee el superadministrador). Pendiente de verificar a mano | Pendiente | |
| Guarda fecha y fuente | **Completa.** `lib/cron/almacen-supabase.test.ts` («guarda el clima con el onConflict del punto y la fecha», incluye `fuente` y `descargadoEn`); `lib/cron/ejecutar-corrida.test.ts` («dos puntos con datos: guarda clima y riesgo y cierra en ok», comprueba `fuente` igual a `open-meteo`); `lib/weather/open-meteo.test.ts` («pide 48 horas locales de Lima con las tres variables») | Recomendada. Revisar una fila de `clima_diario` y de `riesgo_diario` con su fecha y fuente | Pendiente | |
| Si falla, conserva el último dato y lo marca | **Completa (con datos simulados).** `lib/cron/ejecutar-corrida.test.ts` («si un punto falla, los otros siguen y el estado es parcial sin escribir nada del fallido», «si todos fallan, el estado es error», «nivel null: guarda el clima, no escribe riesgo y cuenta la zona con error», «si falla guardar el clima, no calcula ni escribe riesgo de ese punto»); `app/api/cron/risk/route.test.ts` («500 si ninguna zona se pudo actualizar, sin filtrar el error interno») | **Necesaria.** No se ha provocado una falla real del clima en producción (ver «Errores conocidos»). Pendiente de verificar a mano | Pendiente | |

### CAFG-112 · Cálculo del semáforo con motivo

| Criterio | Cobertura automática | Pasos manuales | Resultado | Evidencia |
|---|---|---|---|---|
| Tres niveles | **Completa.** `lib/risk/calcular-riesgo.test.ts` («poco favorable con 5 horas seguidas (índice 0.42)», «favorable con 7 horas seguidas (índice 0.58)», «muy favorable con 11 horas seguidas (índice 0.92)» y el describe «bordes») | Recomendada. Ver en `/semaforo` el nivel del día. Solo se puede probar el nivel que dio el cron ese día | Pendiente | |
| Guarda el motivo en una frase sencilla | **Completa.** `lib/risk/motivo.test.ts` («redacta el motivo: %s», «es una sola frase y evita palabras prohibidas: %s»); `lib/semaforo/presentacion.test.ts` («deja el motivo igual y calcula la barra») | Recomendada. Leer el motivo en la tarjeta y confirmar que se entiende (la redacción la debe revisar Frontend) | Pendiente | |
| Se recalcula cada día | **Parcial.** `lib/cron/ejecutar-corrida.test.ts` («repetir el mismo día no duplica clima ni riesgo; solo suma una fila en cron_runs», «usa la fecha de Lima, no la de UTC»); `lib/risk/calcular-riesgo.test.ts` («misma entrada, misma salida») | **Necesaria.** Comparar la fecha de `riesgo_diario` en dos días seguidos (la fecha y `calculado_en` deben cambiar). Pendiente de verificar a mano | Pendiente | |

### CAFG-113 · Ver semáforo de mi zona

| Criterio | Cobertura automática | Pasos manuales | Resultado | Evidencia |
|---|---|---|---|---|
| Tres estados con color y texto, no solo color | **Completa.** `components/semaforo-card.test.tsx` («nivel %s: texto, icono, color, barra, qué hacer y motivo tal cual», «cada nivel usa un icono distinto»); `lib/semaforo/presentacion.test.ts` («los tres niveles tienen la etiqueta y el color acordados», «cada nivel tiene un icono distinto (no depende solo del color)», «el color del texto contrasta al menos 4.5:1 con el fondo y el borde 3:1») | Recomendada. Ver la tarjeta en un teléfono real a pleno sol (el contraste se probó con cálculo, no a la vista) | Pendiente | |
| Muestra la zona y la fecha de la estimación | **Completa.** `components/semaforo-card.test.tsx` (mismo caso por nivel: «Estimación del …» y la zona); «dato vencido: dice «Dato del …» y no la nota de ayer»; `lib/semaforo/presentacion.test.ts` («escribe el día y el mes sin desfase»); `lib/semaforo/estado.test.ts` («'hoy' sigue la fecha de Lima: 04:59Z todavía es el día anterior») | Recomendada. Confirmar que la fecha mostrada es la del dato | Pendiente | |
| Indica qué hacer | **Completa.** `lib/semaforo/presentacion.test.ts` («los textos de qué hacer son los acordados»); `components/semaforo-card.test.tsx` (mismo caso por nivel) | **Necesaria.** Los tres textos de «qué hacer» son supuestos: falta validarlos con SENASA/INIA o con un técnico | Pendiente | |
| Aclara que es una estimación de la zona | **Completa.** `lib/semaforo/presentacion.test.ts` («avisa que es una estimación de la zona, no una medición de la parcela»); `components/semaforo-card.test.tsx` («dato vencido…» y el caso por nivel) | — | Pendiente | |

### CAFG-114 · Pedir permiso de avisos — **NO ENTREGADO**

El aviso push real quedó como **mejora posterior** por decisión del equipo. No existen la suscripción, el permiso ni el envío (`lib/push` y `notification_log` no existen). No hay pruebas automáticas ni manuales posibles: los criterios siguen abiertos.

| Criterio | Cobertura automática | Pasos manuales | Resultado | Evidencia |
|---|---|---|---|---|
| No se pide al abrir la página | Ninguna (no existe la pantalla ni el permiso) | No aplica: no está implementado | **No entregado** | |
| Se explica para qué antes de pedirlo | Ninguna | No aplica: no está implementado | **No entregado** | |
| Si lo rechazo, no se insiste | Ninguna | No aplica: no está implementado | **No entregado** | |

### CAFG-115 · Aviso del semáforo al ingresar (dentro de la app)

Esta historia entrega un **recordatorio al abrir la app**, no un aviso push. Ver [`aviso-en-app.md`](aviso-en-app.md).

| Criterio | Cobertura automática | Pasos manuales | Resultado | Evidencia |
|---|---|---|---|---|
| Fuerza distinta por nivel: poco favorable franja verde, favorable bloque amarillo, muy favorable bloque rojo | **Completa.** `lib/semaforo/aviso.test.ts` («poco favorable: franja discreta», «%s: bloque completo»); `components/aviso-semaforo.test.tsx` («AvisoSemaforo: franja verde (poco favorable)», «AvisoSemaforo: bloques amarillo y rojo», «cada nivel usa un icono distinto (no depende solo del color)», «usa los colores del nivel con borde de 1.5 px»); `app/page.test.tsx` («con dato del día: el caficultor ve el aviso según el nivel») | Recomendada. Ver el aviso en el celular con el nivel real del día (solo se ve el nivel que dio el cron) | Pendiente | |
| Sin zona invita a elegirla | **Completa.** `lib/semaforo/aviso.test.ts` («sin zona elegida: invitación a elegir la zona»); `components/aviso-semaforo.test.tsx` («invita a elegir la zona y lleva a /semaforo»); `app/page.test.tsx` («sin zona elegida: el caficultor ve la invitación») | Recomendada. Cuenta nueva: «Elegir mi zona» lleva a `/semaforo` | Pendiente | |
| Dato vencido, sin dato o error no muestra nada | **Completa.** `lib/semaforo/aviso.test.ts` («dato de ayer a las 12:00 de Lima: no se muestra nada», «dato de hace varios días: no se muestra nada»); `app/page.test.tsx` («si leer el semáforo lanza un error, el inicio sigue sin aviso», «si no se puede crear el cliente de Supabase, el inicio sigue sin aviso») | **Necesaria** para el dato vencido real: no se puede provocar sin escribir en la base (ver «Errores conocidos»). Pendiente de verificar a mano | Pendiente | |
| Cerrar oculta el aviso el resto del día en hora de Lima y deja una franja | **Completa.** `components/aviso-semaforo.test.tsx` («guarda el día de Lima y deja la franja con «Ver semáforo»», «si ya se cerró ese día, al abrir queda la franja y no el aviso completo», «un cierre de otro día no oculta el aviso de hoy», «lo guardado no incluye zona, nivel ni usuario», «si localStorage falla»); `lib/semaforo/aviso.test.ts` («usa el día calendario de Lima, no el de UTC», «pasadas las 00:00 de Lima cambia el día») | Recomendada. Cerrar, recargar y confirmar la franja; observar el parpadeo inicial (aceptado, ver «Errores conocidos») | Pendiente | |
| Antes de las 12:00 de Lima acepta el dato de ayer con su nota | **Completa.** `lib/semaforo/aviso.test.ts` («dato de ayer a las 11:59 de Lima: se muestra con la marca esDeAyer», «el dato de ayer tolerado conserva la marca esDeAyer en franja y bloque»); `lib/semaforo/estado.test.ts` («a las 11:59 de Lima se tolera todavía», «desde las 12:00 de Lima ya es vencido»); `components/aviso-semaforo.test.tsx` («muestra la nota de las 6 a. m. solo con el dato de ayer») | **Necesaria.** Solo se ve en vivo si se abre la app antes de las 12:00 de Lima y el cron del día aún no corrió. Pendiente de verificar a mano | Pendiente | |
| No cambia el inicio actual | **Completa.** `components/farmer-home.test.tsx` («sin aviso, el inicio queda como antes (tarjeta pegada al encabezado)», «muestra el aviso entre el encabezado y la tarjeta «Revisar una hoja»») | Recomendada. Comparar el inicio con y sin aviso | Pendiente | |
| Solo caficultor | **Completa.** `components/app-navigation.test.tsx` («el caficultor ve Inicio · Semáforo · Historial, en ese orden y sin el panel», «el superadministrador NO ve «Semáforo»: su menú sigue siendo Inicio · Historial · Panel del equipo»); `app/page.test.tsx` («el superadministrador sigue yendo a /panel y no se lee el semáforo»); `lib/auth/roles.test.ts` («identifies feature routes that require a session») | Recomendada. Entrar como superadministrador y confirmar que va a `/panel` | Pendiente | |

### Apoyo: CAFG-160 (tolerancia a fallas del clima) y CAFG-165 (dato vencido)

Se toman del plan del frente (`frente-semaforo-y-avisos.md`) y de lo que pide la historia: dato vencido, conserva el último semáforo con su fecha y «Calculado hace X horas».

| Criterio | Cobertura automática | Pasos manuales | Resultado | Evidencia |
|---|---|---|---|---|
| CAFG-160: conserva el último semáforo con su fecha | **Parcial.** `lib/cron/ejecutar-corrida.test.ts` («si un punto falla, los otros siguen y el estado es parcial sin escribir nada del fallido»); `lib/semaforo/estado.test.ts` («con más de un día de atraso es vencido aunque sea de mañana», «el estado de dato conserva el nivel válido y el motivo»). El plan habla de `stale: true`, pero **ese campo no existe**: el dato vencido se deduce de la fecha (ver «Errores conocidos») | **Necesaria.** Pendiente de verificar a mano con un dato vencido real | Pendiente | |
| CAFG-160: la corrida queda en `cron_runs` con el error | **Completa (con datos simulados).** `lib/cron/ejecutar-corrida.test.ts` («si todos fallan, el estado es error»); `lib/cron/almacen-supabase.test.ts` («lanza si Supabase devuelve error») | Recomendada. Mirar `cron_runs` tras un fallo real (no se ha provocado) | Pendiente | |
| CAFG-160: no se avisa con datos viejos | **Completa.** `lib/semaforo/aviso.test.ts` («dato de ayer a las 12:00 de Lima: no se muestra nada», «dato de hace varios días: no se muestra nada»). El aviso push no existe, así que esto cubre solo el aviso del inicio | — | Pendiente | |
| CAFG-160 y CAFG-165: con dato vencido, la pantalla dice de qué fecha es el dato | **Completa.** `components/semaforo-card.test.tsx` («dato vencido: dice «Dato del …» y no la nota de ayer») | Recomendada. Ver «Dato del …» en un dato vencido real | Pendiente | |
| CAFG-165: «Calculado hace X horas» solo con el dato vencido | **Completa.** `components/semaforo-card.test.tsx` («SemaforoCard: antigüedad del dato vencido»: «dato vencido: «Calculado hace 31 horas» justo debajo de «Dato del …»», «dato vencido de varios días: lo dice en días», no aparece en dato de hoy ni sin dato); `app/semaforo/page.test.tsx` («muestra «Dato del …» y debajo «Calculado hace 31 horas» a partir de calculado_en», «con el dato del día no aparece la línea, aunque exista calculado_en») | Recomendada. Verlo con un dato vencido real o con la vista previa temporal fuera de Git | Pendiente | |
| CAFG-165: cálculo correcto de la antigüedad (horas y días, bordes) | **Completa.** `lib/semaforo/presentacion.test.ts` («antiguedadDelDato»: «menos de 1 hora», «de 2 a 47 horas…», «desde 48 horas, en días enteros…», «fecha futura (reloj desfasado): null», «nulo, ausente o inválido: null»); `lib/semaforo/leer.test.ts` («trae calculadoEn cuando la fila tiene calculado_en», «pide calculado_en en la consulta de riesgo_diario») | — | Pendiente | |

## b) Errores conocidos y límites

«Crítico» quiere decir que impide cumplir un criterio de aceptación o puede mostrar información falsa al caficultor. Lo que no se pudo confirmar leyendo el código o las pruebas figura como *Pendiente de verificar a mano*.

| # | Descripción | Impacto | ¿Crítico? | Qué falta | Dónde se comprobó |
|---|---|---|---|---|---|
| 1 | **CAFG-114 y el aviso push no están entregados.** No existen permiso, suscripción ni envío; el aviso solo aparece al abrir la app | El caficultor que no abre la app no se entera del nivel | **Sí** para CAFG-114 (historia Alta sin entregar). El recordatorio en la app sí funciona | Historia aparte (mejora posterior, CAFG-198): suscripción con VAPID, envío desde el cron, registro para no repetir avisos. En iPhone exige iOS 16.4 o superior y la web instalada | `aviso-en-app.md` (Límites); no existen `lib/push` ni `notification_log` en el repositorio |
| 2 | **Parpadeo del aviso.** Se pinta completo y, si ya se había cerrado, pasa a franja al montar | Un parpadeo breve en el inicio de quien ya cerró el aviso | No (aceptado) | Si molesta, rediseñar la lectura del cierre | `aviso-en-app.md` (Cerrar el aviso); `components/aviso-semaforo.test.tsx` («si ya se cerró ese día, al abrir queda la franja…») |
| 3 | **Los textos de «qué hacer» no están validados con un técnico** (ni la frase de manchas amarillas y polvo anaranjado) | Una recomendación sin respaldo técnico | **Sí**, antes de usar la app con caficultores reales. No bloquea la demostración | Validar con SENASA/INIA o un técnico | `pantalla-semaforo.md` (Supuestos a validar); `lib/semaforo/presentacion.ts` |
| 4 | **El nivel solo se prueba con el dato real del día.** No hay forma de forzar un nivel en producción | No se pueden mostrar los tres niveles a voluntad en una demostración | No | Vista previa temporal fuera de Git, o datos de ejemplo solo para pruebas | `guion-demostracion.md` (Plan B); `calculo-riesgo.md` |
| 5 | **No se ha provocado una falla real del clima en producción.** Solo está cubierta por pruebas con datos simulados | No se ha visto el comportamiento real de «conserva y marca» | No | Prueba manual cuando sea posible (por ejemplo, una corrida con la fuente caída), mirando `cron_runs` | `lib/cron/ejecutar-corrida.test.ts`; `descarga-clima.md` |
| 6 | **Zona desactivada después de elegida.** El trigger solo se evalúa al escribir `zona_clima_id`; quien ya tenía la zona la conserva y verá «sin dato» | Un caficultor puede quedar con una zona sin estimaciones | No | Decidir qué hacer al desactivar una zona (avisar o reasignar) | `pantalla-semaforo.md` (`PATCH /api/perfil/zona`, hueco documentado) |
| 7 | **Menú del caficultor con tres enlaces en pantallas muy angostas (360 px) sin verificar** | Puede que «Semáforo» no quepa bien | No | Revisar en un teléfono de 360 px (el documento menciona 375 px). Pendiente de verificar a mano | `aviso-en-app.md` (Supuestos a validar); `content/navigation.ts` |
| 8 | **Actualización de seguridad de Next.js pendiente, en otra rama.** | Fuera del alcance de esta rama | No | Hacerla en su propia rama | Aviso del equipo; no se comprobó en este documento |
| 9 | **Validación contra el índice de SENAMHI pendiente (CAFG-161).** La escala `racha / 12` es construcción propia y todos los parámetros son supuestos | No se sabe cuánto se parece el semáforo al índice publicado | No bloquea; limita la confianza | Comparar al menos una semana con SENAMHI y registrar diferencias | `calculo-riesgo.md` (secciones 4 y 10) |
| 10 | **El índice discrimina poco.** Con 14 días reales, 10 de 14 salieron «favorable» o más, y 3 de los 4 días «poco favorable» salen de la regla de lluvia, que no está en el artículo | El semáforo podría estar casi siempre en amarillo o rojo | No bloquea; es un riesgo de utilidad | CAFG-161 (con y sin `aplicarReglaLluvia`) | `calculo-riesgo.md` (secciones 6 y 7) |
| 11 | **«stale: true» no existe como campo.** El plan del frente lo pide, pero el dato vencido se deduce comparando la fecha de la última fila de `riesgo_diario` con el día de Lima | El criterio de CAFG-160 se cumple por otra vía, no con ese campo | No | Aclarar el criterio en Jira o agregar el campo en otra historia | `lib/semaforo/estado.ts`; `descarga-clima.md` (Cómo se marca un fallo). No hay `stale` en el código |
| 12 | **No se puede provocar un «dato vencido» sin escribir en `riesgo_diario`**, que solo escribe el cron con la clave de servidor | El estado de dato vencido solo se ve de verdad si el cron deja de actualizar la zona | No | Vista previa temporal fuera de Git, o esperar a un fallo real | `modelo-datos.md` (RLS: sin políticas de escritura) |
| 13 | **Un solo dato por día.** Si el cron falla por la mañana, el dato de ayer se acepta hasta las 12:00 de Lima; después el aviso desaparece | El caficultor deja de ver el aviso hasta que el cron funcione | No | Valorar reintentos o un segundo horario | `aviso-en-app.md` (Límites); `lib/semaforo/estado.ts` |
| 14 | **El aviso sigue con el día con el que se cargó la página** si la app queda abierta pasada la medianoche de Lima | Un aviso de un día que ya pasó hasta recargar | No | Aceptado por ahora | `aviso-en-app.md` (Límites) |
| 15 | **El inicio espera de 1 a 3 consultas a Supabase antes de pintar** | Puede sentirse más lento | No | Si molesta, envolver el aviso en `Suspense` | `aviso-en-app.md` (Límites); `app/page.tsx` |
| 16 | **Límites de Vercel Hobby.** El cron tiene ±59 minutos de precisión, corre solo en producción, no reintenta y Vercel lo llama «legacy» | El dato puede llegar hasta cerca de las 07:00 de Lima; un fallo no se reintenta | No | Migrar a Schedules más adelante | `descarga-clima.md` (Límites de Vercel) |
| 17 | **Las tres zonas activas comparten un punto de clima**, así que dan el mismo resultado | Probar el selector no demuestra diferencias reales entre zonas | No | Verificar coordenadas de las demás zonas | `pantalla-semaforo.md` (Supuestos a validar); `descarga-clima.md` |
| 18 | **La pantalla no muestra temperatura ni humedad** (`riesgo_diario` no las trae) | El caficultor no ve esos datos | No | Decisión pendiente de Piero | `pantalla-semaforo.md` (Qué datos se pueden mostrar) |
| 19 | **Open-Meteo es solo para uso no comercial** | Válido para el MVP académico; si el proyecto cobra hay que cambiar de fuente o pagar un plan | No (para este MVP) | Declararlo y revisar antes de cobrar | `descarga-clima.md` (Fuente y licencia); `modelo-infeccion.md` |
| 20 | **CI solo corre `pnpm test`**: no corre `tsc` ni lint | Un error de tipos puede llegar a `main` sin avisar | No | Agregar un paso de `tsc` al flujo (cambio de equipo, fuera de esta rama) | `.github/workflows/deploy-production.yml`; `ci-cd.md` |
| 21 | **La prueba `scripts/semaforo/clima-saposoa.test.mjs` no corre en CI** y el script duplica parámetros de `lib/risk` | Puede desactualizarse sin que nadie lo note | No | Borrar el script (ya lo reemplaza `lib/risk`) en un PR pequeño | `modelo-infeccion.md` (sección 6); `calculo-riesgo.md` (sección 10) |
| 22 | **Si `calculado_en` faltara en algún entorno**, `/semaforo` mostraría el estado de error y el aviso del inicio se ocultaría (la lectura del semáforo es compartida) | Un entorno sin la migración `20261111_clima_riesgo_cron.sql` no mostraría el semáforo | No (en el entorno compartido la columna existe por esa migración) | Aplicar siempre la migración antes de desplegar | `lib/semaforo/leer.ts`; `leer.test.ts` («un error de cualquier lectura devuelve error (p. ej. migración sin aplicar)») |
| 23 | **Aviso de privacidad (CAFG-176) y uso de la ubicación (CAFG-177) no están hechos** | La zona se elige a mano | No | Historias propias | `pantalla-semaforo.md` (Qué falta) |
| 24 | **La comprobación visual en un teléfono real y la validación de colores a pleno sol no se han hecho** | No se sabe cómo se ve el semáforo en condiciones reales | No bloquea | Prueba manual (ver la matriz) | `pantalla-semaforo.md` (Supuestos a validar) |

## c) Resumen

Se cuentan **26 criterios**: 20 de las historias de prioridad Alta (CAFG-111: 3, CAFG-112: 3, CAFG-113: 4, CAFG-114: 3 y CAFG-115: 7) y 6 de apoyo (CAFG-160 y CAFG-165).

| Medida | Alta (20) | Apoyo (6) | Total (26) |
|---|---|---|---|
| Cobertura automática **completa** | 15 | 5 | 20 |
| Cobertura automática **parcial** | 2 | 1 | 3 |
| **Sin** cobertura automática (CAFG-114, no entregado) | 3 | 0 | 3 |
| Prueba manual **necesaria** | 6 | 1 | 7 |
| Prueba manual **recomendada** | 10 | 3 | 13 |
| Sin prueba manual pendiente (—; incluye los 3 de CAFG-114, que no están implementados) | 4 | 2 | 6 |

- **Con cobertura automática (completa o parcial):** 23 de 26 criterios.
- **Necesitan prueba manual** para poder cerrarse: 7. Son la programación del cron en Vercel y una corrida real, la falla real del clima, el recálculo día a día, la validación de los textos de «qué hacer», el dato vencido real, el dato de ayer antes de las 12:00 de Lima y la conservación del último semáforo con dato vencido real. Además, 13 criterios se cubren con pruebas pero conviene verlos en pantalla o en un teléfono real.
- **Quedan abiertos:**
  - CAFG-114 (3 criterios): **no entregado**; el push real es una mejora posterior.
  - La validación contra SENAMHI (CAFG-161) y con un técnico (SENASA/INIA).
  - Todas las pruebas manuales en producción: la columna «resultado» está en **Pendiente** en todos los criterios.
- Las pruebas automáticas usan datos simulados. Que pasen no demuestra que el cron funciona en producción: eso lo cierran las pruebas manuales.
