import { afterEach, describe, expect, it, vi } from "vitest"
import { createCulqiCharge } from "./charge"

describe("createCulqiCharge", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("cobra con la API de Culqi y la llave secreta", async () => {
    vi.stubEnv("CULQI_SECRET_KEY", "sk_test_demo")
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "chr_test_abc",
        outcome: { type: "venta_exitosa", user_message: "Venta exitosa." },
      }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await createCulqiCharge({
      tokenId: "tkn_test_123",
      email: "caficultor@example.com",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.culqi.com/v2/charges",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer sk_test_demo" }),
      }),
    )
    expect(result).toMatchObject({
      id: "chr_test_abc",
      outcome: "approved",
      simulated: false,
      amount: 12,
    })
  })

  it("propaga el mensaje de rechazo de Culqi", async () => {
    vi.stubEnv("CULQI_SECRET_KEY", "sk_test_demo")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ user_message: "Fondos insuficientes." }),
      }),
    )

    await expect(
      createCulqiCharge({ tokenId: "tkn_test_bad", email: "x@y.com" }),
    ).rejects.toThrow("Fondos insuficientes.")
  })
})
