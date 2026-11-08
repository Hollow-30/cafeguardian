import { assertFotoUpload } from "@/lib/fotos/validation"
import { parseClassification, type Classification, type ClassificationProvider } from "./contract"
import { createMockProvider } from "./mock"

export type { Classification } from "./contract"

export function createLeafClassifier(provider: ClassificationProvider) {
  return async (blob: Blob): Promise<Classification> => {
    assertFotoUpload({ byteSize: blob.size, contentType: blob.type })
    return parseClassification(await provider(blob))
  }
}

export const classifyLeaf = createLeafClassifier(createMockProvider())
