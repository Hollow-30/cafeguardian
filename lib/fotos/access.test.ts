import { describe, expect, it } from "vitest"
import { canAccessFoto } from "./access"

describe("foto access", () => {
  const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  const otherId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

  it("lets the owner view and delete", () => {
    expect(
      canAccessFoto({
        user: { id: ownerId, app_metadata: { role: "caficultor" } },
        fotoProfileId: ownerId,
      }),
    ).toBe(true)
  })

  it("blocks another caficultor", () => {
    expect(
      canAccessFoto({
        user: { id: otherId, app_metadata: { role: "caficultor" } },
        fotoProfileId: ownerId,
      }),
    ).toBe(false)
  })

  it("lets a superadministrador access any foto", () => {
    expect(
      canAccessFoto({
        user: { id: otherId, app_metadata: { role: "superadministrador" } },
        fotoProfileId: ownerId,
      }),
    ).toBe(true)
  })

  it("blocks anonymous users", () => {
    expect(canAccessFoto({ user: null, fotoProfileId: ownerId })).toBe(false)
  })
})
