const formato = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

// Fecha calendario en Lima ("AAAA-MM-DD") de un instante. Lima es UTC-5 todo el año.
// Es la única función que depende de la hora: el resto recibe `ahora` como parámetro.
export function fechaEnLima(ahora: Date): string {
  return formato.format(ahora)
}
