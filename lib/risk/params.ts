import type { ParametrosRiesgo } from "./types"

// Todos los valores son "supuesto a validar" (contraste con SENAMHI, historia de S4).
// Ninguno es un valor medido de la roya del café: el artículo de Magarey et al. 2005 no la incluye.
export const PARAMETROS_RIESGO: Readonly<ParametrosRiesgo> = Object.freeze({
  // Rango de temperatura de una hora favorable, en °C, extremos incluidos. Viene del plan del frente.
  temperaturaMin: 22,
  temperaturaMax: 25,
  // Hoja húmeda estimada: humedad relativa estrictamente mayor que este valor (%), o lluvia en esa hora.
  humedadMin: 90,
  // Lluvia diaria desde la cual el índice queda en 0 (mm, este valor ya cuenta). Puede ser contraintuitivo.
  lluviaDiariaMax: 10,
  // Apagar esta regla permite comparar el semáforo con y sin ella (CAFG-161).
  aplicarReglaLluvia: true,
  // Escala nuestra: una racha de esta cantidad de horas seguidas da índice 1.
  horasParaIndiceMaximo: 12,
  // Cortes de los niveles, tomados del producto de SENAMHI (no del artículo de Magarey).
  corteFavorable: 0.5,
  corteMuyFavorable: 0.75,
  // Con menos horas completas que estas en el día evaluado no se calcula nada.
  horasMinimasConDato: 18,
})
