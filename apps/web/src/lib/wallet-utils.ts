/**
 * Normalize wallet signature result to hex string.
 * Handles string, Uint8Array, array, and other formats returned by various wallets.
 */
export function normalizeSignature(
  signature: string | Uint8Array | unknown[] | { toString(): string }
): string {
  if (typeof signature === "string") {
    return signature;
  }
  if (signature instanceof Uint8Array) {
    return Array.from(signature, (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
  }
  if (Array.isArray(signature)) {
    return signature[0] as string;
  }
  return signature.toString();
}
