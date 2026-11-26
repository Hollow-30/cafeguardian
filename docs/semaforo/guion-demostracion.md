# Guion de la demostración: Semáforo y avisos (CAFG-157)

Parte del frente Semáforo y avisos. Dura de **3 a 5 minutos** (unos 4 min 30 s con los tiempos de abajo). Cada paso dice **qué decir** y **qué mostrar**. Las cuentas necesarias están descritas en [`README.md`](README.md#cuentas-de-prueba); las credenciales las guarda el equipo fuera del repositorio.

## Antes de empezar (checklist)

- [ ] Una cuenta de caficultor **sin zona elegida** y otra de **superadministrador**.
- [ ] La app abierta en el navegador (o en el celular) y con sesión cerrada.
- [ ] Si se quiere ver el aviso otra vez después de cerrarlo: borrar del navegador la clave `cg-aviso-semaforo-cerrado:AAAA-MM-DD` de `localStorage` (el aviso se oculta el resto del día de Lima cuando se cierra).
- [ ] Haber visto cuál es el nivel del día **antes** de presentar (el nivel depende del clima que bajó el cron y no se puede cambiar a mano). Así se sabe si saldrá franja verde, bloque amarillo o bloque rojo.
- [ ] Revisar que el cron corrió ese día (si hay dato del día, el aviso y la tarjeta se ven completos). Si no, ir al **Plan B**.

## Pasos

| # | Tiempo | Qué mostrar | Qué decir |
|---|---|---|---|
| 1 | 0:20 | Pantalla de inicio de la app (aún sin sesión) | «El semáforo le dice al caficultor qué tan favorable está el clima de su zona para que la roya avance. Es una estimación de la zona, no una medición de su parcela, y no dice si su planta tiene roya.» |
| 2 | 0:25 | Entrar como **caficultor sin zona**. En el inicio aparece la invitación «Elige tu zona para ver el semáforo» con el botón «Elegir mi zona» | «Si el caficultor todavía no eligió su zona, el inicio se la pide. No le muestra ningún dato inventado.» |
| 3 | 0:30 | Pulsar «Elegir mi zona»: lleva a `/semaforo` con el selector. Elegir **Saposoa** | «Elige la zona más cercana a su finca. Se guarda en su perfil con su propia sesión, no con una clave de servidor.» |
| 4 | 0:30 | Volver al **Inicio** por el menú. Se ve el **aviso** entre el encabezado y la tarjeta «Revisar una hoja»: franja verde, bloque amarillo o bloque rojo según el nivel del día | «Al abrir la app ve el estado de su zona. Si es poco favorable, una franja tranquila; si es favorable, un bloque amarillo; si es muy favorable, un bloque rojo más marcado. El nivel va siempre en texto, color e icono distinto, no solo en color.» |
| 5 | 0:25 | Pulsar la **X** del aviso. Queda una franja neutra con «Ver semáforo» | «Si lo cierra, no vuelve a insistir ese día (cuenta el día de Lima). Queda una franja pequeña para que siempre pueda entrar al semáforo.» |
| 6 | 0:50 | Entrar por el menú a **Semáforo**. Mostrar, en orden: el nivel, el motivo, la barra, «Qué hacer», la fecha del dato, el texto «Estimación para la zona Saposoa (unos 9 km a la redonda). No es una medición de tu parcela.» y el crédito «Weather data by Open-Meteo.com» con «CC BY 4.0» | «Aquí está el detalle: el nivel, la frase que explica por qué, qué conviene hacer y de qué fecha es el dato. Debajo, la aclaración de que es una estimación de unos 9 kilómetros y el crédito de Open-Meteo, que es nuestra fuente de clima y es gratuita para uso no comercial.» |
| 7 | 0:30 | Pulsar «Cambiar zona», mostrar la lista y cerrarla (o elegir otra zona) | «Puede cambiar de zona cuando quiera. Ahora hay tres zonas activas y comparten el mismo punto de clima, así que dan el mismo resultado; no es una diferencia real entre ellas.» |
| 8 | 0:40 | Cerrar sesión y entrar como **superadministrador**. Va a `/panel`. Mostrar el menú: Inicio · Historial · Panel del equipo | «El superadministrador no ve el aviso ni la entrada “Semáforo”: el semáforo es del caficultor. Su inicio sigue siendo el panel del equipo.» |

## Qué decir con honestidad

Decirlo en voz alta, sin que lo pregunten:

- **Es un recordatorio al abrir la app, no un aviso temprano.** Solo aparece cuando la persona entra. Si no abre la app, no se entera.
- **El aviso push real es una mejora posterior.** Pedir permiso de notificaciones y avisar con la app cerrada **no está entregado** (CAFG-114). Se decidió como siguiente paso del equipo.
- **Es una estimación de la zona, no de la parcela.** Unos 9 km a la redonda, a partir de un modelo de clima, no de un sensor en la finca. Tampoco es una probabilidad de tener roya ni un diagnóstico.
- **Los textos de «qué hacer» son supuestos por validar** con SENASA/INIA o con un técnico. Lo mismo la regla de cálculo, que todavía no se ha contrastado con el índice de SENAMHI.
- **El nivel del día depende del cálculo del cron y no se puede forzar.** Lo que se muestra es lo que salió ese día; no hay un botón para cambiarlo.
- **Un solo dato por día.** Si el cron falla, la pantalla conserva el último dato y dice de qué fecha es; el aviso del inicio no se muestra con un dato vencido.

## Plan B: si no hay dato del día

No inventar ni cambiar el dato. Según lo que se vea:

| Qué se ve | Qué decir | Qué mostrar |
|---|---|---|
| El inicio **sin aviso** y `/semaforo` con «Dato del …» (dato vencido) y debajo «Calculado hace X horas» | «El cálculo del día no llegó. La app lo dice con la fecha del último dato y no lo muestra como si fuera nuevo; el aviso del inicio no aparece con datos viejos.» | Entrar a `/semaforo` y mostrar la fecha y la antigüedad |
| «Todavía no hay estimación para la zona …» (zona sin ningún dato) | «Esta zona aún no tiene ninguna estimación y la app lo dice en lugar de inventar un nivel.» | La tarjeta sin nivel y con el crédito de Open-Meteo |
| «No pudimos cargar el semáforo…» con «Volver a cargar» | «Si falla la lectura, la app lo avisa y deja reintentar.» | Pulsar «Volver a cargar» |
| Se quiere enseñar los **tres niveles** y el dato del día es solo uno | «Estos son los tres niveles posibles.» | Una página de vista previa temporal fuera de Git (que no se sube al repositorio), o la tabla de 14 días reales de [`calculo-riesgo.md`](calculo-riesgo.md) (sección 6) y los textos de [`aviso-en-app.md`](aviso-en-app.md) |

Si nada de esto funciona, se cuenta el flujo con la tabla de estados de [`pantalla-semaforo.md`](pantalla-semaforo.md) y se dice que la comprobación en vivo queda pendiente.

## Si preguntan

- **¿Por qué no avisa al celular solo?** Porque el aviso push real es una mejora posterior; esta entrega es el recordatorio dentro de la app. Además, en iPhone el push exige iOS 16.4 o superior y la web instalada en la pantalla de inicio, por lo que no se puede depender de él para llegar a todos.
- **¿De dónde sale el nivel?** Del clima por hora de Open-Meteo: racha de horas seguidas con temperatura de 22 a 25 °C y hoja húmeda estimada, dividida entre 12. Ver [`calculo-riesgo.md`](calculo-riesgo.md). La escala es construcción propia del equipo y todos los parámetros están marcados como supuesto por validar.
- **¿Y si el clima falla?** Se conserva el último dato y el fallo queda registrado en la corrida; ver [`descarga-clima.md`](descarga-clima.md).
