import { describe, expect, it } from "vitest"
import { classifyLeaf } from "./classifyLeaf"

describe("classifyLeaf", () => {
  it("returns a typed demo classification without uploading", async () => {
    const result = await classifyLeaf(new Blob(["leaf"], { type: "image/jpeg" }))
    expect(result).toEqual({ label: "healthy", confidence: 60, isDemo: true })
  })
})
