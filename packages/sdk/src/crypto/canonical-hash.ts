import { createHash } from "node:crypto";
import canonicalize from "canonicalize";

/**
 * Compute a deterministic SHA-256 hash of a JSON object using RFC 8785
 * canonical JSON serialization. This ensures the same data always produces
 * the same hash regardless of key ordering.
 */
export function canonicalHash(data: Record<string, unknown>): string {
  const canonical = canonicalize(data);
  if (!canonical) throw new Error("Failed to canonicalize data");
  return createHash("sha256").update(canonical).digest("hex");
}
