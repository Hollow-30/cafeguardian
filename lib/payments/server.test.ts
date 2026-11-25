import { describe, expect, it } from "vitest"
import { buildPagoObjectKey, mapPagoEstadoToUi, rowToPagoPublico } from "./server"

describe("payments server helpers", () => {
  it("mapea estados de DB a UI", () => {
    expect(mapPagoEstadoToUi("en_revision")).toBe("under_review")
    expect(mapPagoEstadoToUi("aprobado")).toBe("approved")
    expect(mapPagoEstadoToUi("rechazado")).toBe("rejected")
  })

  it("arma la clave R2 del comprobante", () => {
    expect(buildPagoObjectKey("p1", "application/pdf")).toBe("pagos/p1.pdf")
    expect(buildPagoObjectKey("p1", "image/png")).toBe("pagos/p1.png")
  })

  it("serializa la fila pública", () => {
    expect(
      rowToPagoPublico({
        id: "1",
        referencia: "CG-1",
        monto: "12.00",
        metodo: "yape",
        receipt_name: "voucher.jpg",
        estado: "en_revision",
        motivo_rechazo: null,
        created_at: "2026-11-24T12:00:00.000Z",
      }),
    ).toMatchObject({
      id: "1",
      reference: "CG-1",
      amount: 12,
      method: "yape",
      status: "under_review",
    })
  })
})
