import { Network } from "@aptos-labs/ts-sdk";
import { getAptosNetwork, TESTNET_CHAIN_ID } from "./aptos-config";

/**
 * Ensure the wallet is on the correct network before signing.
 * Silently continues if changeNetwork is unavailable or fails —
 * server-side chain ID validation will catch mismatches.
 */
export async function ensureCorrectNetwork(
  changeNetwork: ((network: Network) => Promise<unknown>) | undefined,
  network: { chainId?: number } | null | undefined
): Promise<void> {
  if (network?.chainId === TESTNET_CHAIN_ID) return;
  if (!changeNetwork) return;
  try {
    await changeNetwork(getAptosNetwork());
  } catch {
    // Wallet rejected or doesn't support changeNetwork — continue anyway
  }
}

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
