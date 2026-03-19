import { Network } from "@aptos-labs/ts-sdk";
import { getAptosNetwork, TESTNET_CHAIN_ID } from "./aptos-config";

/**
 * Ensure the wallet is on the correct network before signing.
 * - If already on correct chain → no-op.
 * - If changeNetwork is unavailable → silently continue (server will reject).
 * - If changeNetwork is available but fails → fail-closed with actionable error.
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
    throw new Error(
      "Please switch your wallet to Aptos Testnet and try again."
    );
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
