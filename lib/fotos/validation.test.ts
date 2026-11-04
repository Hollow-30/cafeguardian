import { describe, expect, it } from "vitest"
import { FOTO_MAX_BYTES, assertFotoUpload } from "./validation"

describe("foto upload validation", () => {
  it("allows jpeg under 10 MB", () => {
    expect(() =>
      assertFotoUpload({ byteSize: 1024, contentType: "image/jpeg" }),
    ).not.toThrow()
  })

  it("rejects files over 10 MB", () => {
    expect(() =>
      assertFotoUpload({ byteSize: FOTO_MAX_BYTES + 1, contentType: "image/jpeg" }),
    ).toThrow(/10 MB/)
  })

  it("rejects unsupported content types", () => {
    expect(() =>
      assertFotoUpload({ byteSize: 100, contentType: "application/pdf" }),
    ).toThrow(/no permitido/i)
  })
})
