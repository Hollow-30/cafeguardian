import type { Classification, ClassificationProvider } from "./contract"

export const mockScenarios = {
  healthy: { label: "healthy", confidence: 88, isDemo: true },
  rust: { label: "rust", confidence: 92, isDemo: true },
  "healthy-low-confidence": { label: "healthy", confidence: 55, isDemo: true },
  "rust-low-confidence": { label: "rust", confidence: 55, isDemo: true },
} as const satisfies Record<string, Classification>

export type MockScenario = keyof typeof mockScenarios

export function createMockProvider(scenario: MockScenario = "healthy"): ClassificationProvider {
  return async () => ({ ...mockScenarios[scenario] })
}
