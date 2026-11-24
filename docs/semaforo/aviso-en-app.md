# Aviso del semáforo en la app (CAFG-115)

Responsable: Frente Semáforo y avisos.

Al abrir la app, el caficultor ve en su inicio un **aviso del semáforo de su zona** y tiene una entrada «Semáforo» fija en el menú. Es un **recordatorio al abrir la app**: solo aparece cuando la persona entra. No es un aviso temprano ni llega al teléfono por sí solo. El aviso push real (que llegue aunque la app esté cerrada) es una mejora posterior, en otra historia; ver «Límites».

El semáforo mide qué tan favorable es el clima para que la roya avance. No es una probabilidad de tener roya ni un diagnóstico, y los textos no usan esas palabras.

## Qué se agregó

| Pieza | Qué hace |
|---|---|
| `lib/semaforo/aviso.ts` | Función pura `decidirAviso({ estado, ahora })`: decide `bloque`, `franja`, `invitacion` o `nada`. También `claveCierreAviso(dia)` |
| `components/aviso-semaforo.tsx` | Componente cliente con las cuatro vistas y la X para cerrar |
| `TEXTOS_AVISO` en `lib/semaforo/presentacion.ts` | Solo los textos nuevos. Nivel, icono, colores y «qué hacer» salen de `NIVELES_PRESENTACION`; la nota de estimación y la del dato de ayer, de `TEXTOS_SEMAFORO` |
| `app/page.tsx` | Lee el semáforo con la sesión del usuario (RLS) dentro de `try/catch` y pasa el aviso a `FarmerHome` |
| `components/farmer-home.tsx` | Prop opcional `aviso?: ReactNode`, ubicada entre el encabezado y la tarjeta «Revisar una hoja» |
| `content/navigation.ts` y `components/app-navigation.tsx` | Enlace «Semáforo» (icono de sol con nube) entre Inicio e Historial, solo para el rol caficultor |

No hay migraciones, no se cambió el cron y no se agregaron dependencias.

## Regla de visibilidad

La decisión parte de `estadoSemaforo`, el mismo que usa la pantalla `/semaforo`.

| Estado | Qué se muestra |
|---|---|
| `sin_zona` | **Invitación**: «Elige tu zona para ver el semáforo», con el botón «Elegir mi zona» que lleva a `/semaforo` (ahí está el selector) |
| `dato_de_hoy`, poco favorable | **Franja verde** discreta de una línea |
| `dato_de_hoy`, favorable | **Bloque amarillo** completo |
| `dato_de_hoy`, muy favorable | **Bloque rojo** marcado (borde grueso e icono de peligro) |
| `dato_vencido` | Nada |
| `zona_sin_dato` | Nada |
| `error_lectura` | Nada |
| `cargando` | Nada (no existe en el inicio: la lectura se hace en el servidor) |

Si la lectura lanza un error (por ejemplo, no se puede crear el cliente de Supabase), no se muestra nada y el inicio sale igual que antes.

### Dato de hoy y dato de ayer

El cron corre alrededor de las 06:00 de Lima, así que hay **un dato por día**. Antes de las 12:00 de Lima se acepta el dato de ayer (`esDeAyer`), con la nota «El de hoy se calcula alrededor de las 6 a. m.»: visible en el bloque y como línea pequeña en la franja. Esa tolerancia no se repite en el aviso: la aplica `estadoSemaforo` con `HORA_LIMITE_DATO_DE_AYER` (12). Pasadas las 12:00, un dato de ayer cuenta como vencido y no se muestra.

## Cerrar el aviso

- La X (`aria-label` «Cerrar aviso», de 44 px) oculta el aviso **el resto de ese día calendario de Lima**. Está en la franja, el bloque y la invitación.
- Tras cerrar queda, en el mismo lugar, una **franja neutra de una línea** con el enlace «Ver semáforo» a `/semaforo`, para que el inicio nunca se quede sin acceso. El foco del teclado pasa a ese enlace.
- Se guarda en `localStorage` con la clave `cg-aviso-semaforo-cerrado:AAAA-MM-DD` (día de Lima) y el valor `1`. **No lleva zona, nivel ni datos de la persona.** Al cerrar se borran las claves de días anteriores.
- Todo acceso a `localStorage` va dentro de `try/catch`. Si falla (modo privado, almacenamiento bloqueado o lleno), el aviso simplemente se vuelve a mostrar la próxima vez.
- El primer render, en el servidor y en el cliente, muestra el aviso completo; al montar se lee `localStorage`. Quien ya lo cerró puede ver un parpadeo breve antes de que quede la franja (aceptado).

## Diseño

Mantiene la paleta marrón y crema de la app. Los colores del semáforo salen en hexadecimal de `NIVELES_PRESENTACION`; los de la invitación (`#fbf3ec` de fondo y `#c9a98f` de borde) son una constante del componente.

- **Franja verde** (poco favorable): borde de 1.5 px, alto mínimo de 56 px, círculo con visto bueno, «Semáforo de tu zona: Poco favorable» y «Revisa tus hojas con tu rutina de siempre.». En pantallas anchas va en una línea con «Ver semáforo ›».
- **Bloque amarillo** (favorable) y **bloque rojo** (muy favorable): etiqueta «SEMÁFORO DE TU ZONA · {zona}», nivel en tipografía serif grande, barra de 3 segmentos (2 llenos y 3 llenos), «Qué hacer», botón «Ver semáforo completo» de 48 px y la nota de estimación. Borde de 2 px en el amarillo y de 2.5 px en el rojo, con icono de triángulo y de octágono respectivamente. En pantallas anchas se acomoda en fila; en el celular, apilado.
- **Invitación**: etiqueta «SEMÁFORO DE ROYA», título, botón «Elegir mi zona» y la descripción «Elige la zona más cercana a tu finca y verás cómo está el clima para la roya.».
- Texto fijo de estimación (igual que en la pantalla): «Estimación para la zona {nombre} (unos 9 km a la redonda). No es una medición de tu parcela.»

## Accesibilidad

- El contenedor lleva `role="status"` y `aria-label` «Semáforo de roya de tu zona».
- Enlaces y botones reales (`<a>` y `<button>`), usables con teclado.
- Objetivos táctiles de al menos 44 px; el botón principal, de 48 px.
- El nivel nunca se indica solo con color: va en texto, color e icono distinto (visto, triángulo y octágono con «!»). La barra de 3 segmentos es decorativa.

## Quién lo ve

- Solo el **caficultor**. El superadministrador no cambia: su `/` sigue yendo a `/panel` (sin leer el semáforo) y su menú es Inicio · Historial · Panel del equipo. Hay pruebas que lo verifican.
- El menú del caficultor es Inicio · Semáforo · Historial.

## Límites

- **Es un recordatorio al abrir la app.** No avisa si la persona no la abre. El **aviso push real** queda como mejora posterior: necesita suscripción con VAPID, envío desde el cron y un registro para no repetir avisos (`lib/push`, `notification_log`; aún no existen).
- **Push en iPhone:** requiere iOS 16.4 o superior y la web instalada en la pantalla de inicio. Por eso no se puede depender de él para llegar a todos.
- El semáforo es una **estimación de unos 9 km** a la redonda, no una medición de la parcela.
- Un dato vencido, una zona sin dato o un error de lectura **no muestran aviso**, aunque la pantalla `/semaforo` sí los explica.
- Un solo dato por día: si el cron falla por la mañana, el dato de ayer se acepta hasta las 12:00 de Lima y después el aviso desaparece.
- El inicio ahora espera de 1 a 3 consultas a Supabase antes de pintar. Si se siente lento, el paso siguiente sería envolver el aviso en `Suspense`.
- Si la persona deja la app abierta pasada la medianoche de Lima, el aviso sigue con el día con el que se cargó la página hasta que se recargue.

## Supuestos a validar

- Los textos de «qué hacer» (SENASA/INIA o un técnico), ya anotados en `pantalla-semaforo.md`.
- Las 12:00 de Lima como hora límite del dato de ayer.
- Cerrar el aviso por día calendario de Lima (y no por nivel): con un solo dato por día da lo mismo.
- El aspecto en un teléfono real a pleno sol, y que «Semáforo» quepa en el menú a 375 px de ancho.
