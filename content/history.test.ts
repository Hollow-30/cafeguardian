import { describe, expect, it } from "vitest"
import { filterDiagnoses, paginateDiagnoses, sortDiagnoses } from "./history"
const items = [{ label: "healthy" as const, createdAt: "2026-01-01" }, { label: "rust" as const, createdAt: "2026-03-01" }, { label: "healthy" as const, createdAt: "2026-02-01" }]
describe("historial", () => { it("filtra por resultado", () => expect(filterDiagnoses(items, "healthy")).toHaveLength(2)); it("ordena más reciente primero", () => expect(sortDiagnoses(items)[0].createdAt).toBe("2026-03-01")); it("pagina de diez en diez", () => expect(paginateDiagnoses(Array.from({ length: 21 }, (_, index) => index), 1)).toHaveLength(10)); it("devuelve vacío cuando no hay elementos", () => expect(filterDiagnoses([], "all")).toEqual([])) })
