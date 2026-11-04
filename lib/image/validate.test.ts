import { describe, expect, it } from "vitest"
import { MAX_PHOTO_BYTES, validatePhoto } from "@/lib/image/validate"

describe("validatePhoto", () => {
  it("acepta JPG, PNG y WEBP dentro del límite", () => {
    expect(validatePhoto({ type: "image/jpeg", size: MAX_PHOTO_BYTES })).toBeNull()
    expect(validatePhoto({ type: "image/png", size: 20 })).toBeNull()
    expect(validatePhoto({ type: "image/webp", size: 20 })).toBeNull()
  })
  it("rechaza formatos no permitidos", () => expect(validatePhoto({ type: "image/gif", size: 20 })).toBe("invalid-type"))
  it("rechaza archivos que superan el límite", () => expect(validatePhoto({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 })).toBe("too-large"))
})
