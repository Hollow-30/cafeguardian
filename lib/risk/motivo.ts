import type { NivelRiesgo, ParametrosRiesgo } from "./types"

export interface DatosMotivo {
  nivel: NivelRiesgo | null
  rachaMaxima: number
  lluviaDia: number
  reglaLluviaAplicada: boolean
}

function horasSeguidas(horas: number) {
  return horas === 1 ? "1 hora seguida" : `${horas} horas seguidas`
}

// Una sola frase, en presente (el día evaluado puede ser un pronóstico) y sin afirmar
// que la hoja está mojada: es una estimación del clima, no una medición ni un diagnóstico.
export function construirMotivo(datos: DatosMotivo, parametros: Readonly<ParametrosRiesgo>): string {
  const { nivel, rachaMaxima, lluviaDia, reglaLluviaAplicada } = datos

  if (nivel === null) {
    return "Faltan datos de clima para calcular el semáforo de este día."
  }

  if (reglaLluviaAplicada) {
    return `Mucha lluvia (${lluviaDia} mm): con ${parametros.lluviaDiariaMax} mm o más el semáforo no marca este día como favorable.`
  }

  const temperaturas = `${parametros.temperaturaMin} a ${parametros.temperaturaMax} °C`

  if (nivel === "poco_favorable") {
    if (rachaMaxima === 0) {
      return `El clima ayuda poco a que la roya avance: no hay horas seguidas de hoja húmeda (estimada) con ${temperaturas}.`
    }
    const minimo = Math.ceil(parametros.corteFavorable * parametros.horasParaIndiceMaximo)
    return `El clima ayuda poco a que la roya avance: solo ${horasSeguidas(rachaMaxima)} de hoja húmeda (estimada) con ${temperaturas}, y hacen falta al menos ${minimo} horas.`
  }

  const cuanto = nivel === "muy_favorable" ? "El clima ayuda mucho" : "El clima ayuda"
  return `${cuanto} a que la roya avance: ${horasSeguidas(rachaMaxima)} de hoja húmeda (estimada) con ${temperaturas} y ${lluviaDia} mm de lluvia.`
}
