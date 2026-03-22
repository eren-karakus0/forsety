import type { VectorSearchService } from "../services/vector-search.service.js";

/** Resolve a VectorSearchService that may be a lazy getter. */
export function resolveVectorSearch(
  vs?: VectorSearchService | (() => VectorSearchService)
): VectorSearchService | undefined {
  if (typeof vs === "function") return vs();
  return vs;
}
