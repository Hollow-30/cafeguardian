import { describe, expect, it } from "vitest"
import { buildFotoObjectKey, extensionForContentType } from "./object-key"

describe("foto object keys", () => {
  it("does not include email, name, or user id in the object key", () => {
    const key = buildFotoObjectKey({
      fotoId: "11111111-1111-4111-8111-111111111111",
      contentType: "image/jpeg",
      profileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      email: "ana.real@ejemplo.com",
      fullName: "Ana Pérez",
    })

    expect(key).toBe("fotos/11111111-1111-4111-8111-111111111111.jpg")
    expect(key).not.toContain("ana")
    expect(key).not.toContain("Pérez")
    expect(key).not.toContain("ejemplo.com")
    expect(key).not.toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
  })

  it("maps content types to safe extensions", () => {
    expect(extensionForContentType("image/jpeg")).toBe("jpg")
    expect(extensionForContentType("image/png")).toBe("png")
    expect(extensionForContentType("image/webp")).toBe("webp")
  })
})
