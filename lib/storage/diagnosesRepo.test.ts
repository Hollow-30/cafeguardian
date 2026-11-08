import { beforeEach, describe, expect, it, vi } from "vitest"
import { openCafeGuardianDB } from "./database"
import { getDiagnosis, saveDiagnosis } from "./diagnosesRepo"

vi.mock("./database", () => ({ openCafeGuardianDB: vi.fn() }))

const put = vi.fn()
const get = vi.fn()

describe("diagnosis provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(openCafeGuardianDB).mockResolvedValue({ put, get } as unknown as Awaited<ReturnType<typeof openCafeGuardianDB>>)
  })

  it.each([true, false])("persists isDemo=%s independently of sync status", async (isDemo) => {
    const saved = await saveDiagnosis({ photoId: "photo-1", blob: new Blob(["leaf"]), label: "healthy", confidence: 88, lote: "", isDemo })
    expect(saved).toMatchObject({ isDemo, status: "offline" })
    expect(put).toHaveBeenCalledWith("diagnoses", saved)
  })

  it("does not infer a real origin for legacy records", async () => {
    get.mockResolvedValue({ id: "old", label: "healthy", confidence: 60 })
    expect((await getDiagnosis("old"))?.isDemo).toBeUndefined()
  })
})
