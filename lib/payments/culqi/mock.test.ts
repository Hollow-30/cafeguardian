import { describe, expect, it } from "vitest"
import { createCulqiSimulator } from "./mock"

describe("createCulqiSimulator", () => {
  const culqi = createCulqiSimulator()

  it("tokeniza una tarjeta de prueba", async () => {
    const token = await culqi.createToken({
      cardNumber: "4242 4242 4242 4242",
      expMonth: "12",
      expYear: "30",
      cvv: "123",
      email: "ana@example.com",
    })
    expect(token.simulated).toBe(true)
    expect(token.id).toMatch(/^tok_test_/)
    expect(token.lastFour).toBe("4242")
  })

  it("rechaza la tarjeta de decline", async () => {
    await expect(
      culqi.createToken({
        cardNumber: "4000000000000002",
        expMonth: "12",
        expYear: "30",
        cvv: "123",
        email: "ana@example.com",
      }),
    ).rejects.toThrow(/rechazada/i)
  })
})
