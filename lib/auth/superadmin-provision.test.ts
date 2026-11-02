import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { publicSignupUserMetadata, readSuperadminProvisionInput } from "./superadmin-provision"

describe("public registration", () => {
  it("does not offer or send the Superadministrador role", () => {
    const metadata = publicSignupUserMetadata("Ana")

    expect(metadata).toEqual({ full_name: "Ana" })
    expect(metadata).not.toHaveProperty("role")
    expect(JSON.stringify(metadata)).not.toContain("superadministrador")
  })
})

describe("controlled superadmin provisioning", () => {
  it("refuses to run without an email from the environment", () => {
    expect(() => readSuperadminProvisionInput({})).toThrow(/SUPERADMIN_EMAIL/)
  })

  it("creates accounts only when the password comes from the environment", () => {
    expect(() =>
      readSuperadminProvisionInput({ SUPERADMIN_EMAIL: "equipo@cafeguardian.app" }),
    ).toThrow(/SUPERADMIN_PASSWORD/)

    expect(
      readSuperadminProvisionInput({
        SUPERADMIN_EMAIL: "equipo@cafeguardian.app",
        SUPERADMIN_PASSWORD: "secreto-largo",
      }),
    ).toEqual({
      mode: "create",
      email: "equipo@cafeguardian.app",
      password: "secreto-largo",
    })
  })

  it("can promote an existing account without putting a password in code", () => {
    expect(
      readSuperadminProvisionInput({
        SUPERADMIN_EMAIL: "usuario1@gmail.com",
        SUPERADMIN_PROMOTE: "1",
      }),
    ).toEqual({
      mode: "promote",
      email: "usuario1@gmail.com",
    })
  })

  it("keeps passwords out of the provisioning script", () => {
    const script = readFileSync(new URL("../../scripts/create-superadmin.ts", import.meta.url), "utf8")
    const helper = readFileSync(new URL("./superadmin-provision.ts", import.meta.url), "utf8")
    const source = `${script}\n${helper}`

    expect(helper).toMatch(/SUPERADMIN_PASSWORD/)
    expect(script).toMatch(/password: input\.password/)
    expect(source).not.toMatch(/PASSWORD\s*=\s*['"`]/)
    expect(source).not.toMatch(/password:\s*['"`][^'"`]+['"`]/)
  })
})
