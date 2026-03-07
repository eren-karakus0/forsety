import { SiweMessage } from "siwe";
import type { SiwaMessageParams, SiwaVerifyParams, SiwaVerifyResult } from "./types";

/**
 * Create a SIWA (Sign-In with Shelby) message using EIP-4361 standard.
 * Shelby wallets are EVM-compatible, so SIWE works directly.
 */
export function createSiwaMessage(params: SiwaMessageParams): string {
  const message = new SiweMessage({
    domain: params.domain,
    address: params.address,
    statement: params.statement ?? "Sign in with your wallet to access Forsety",
    uri: params.uri ?? `https://${params.domain}`,
    version: "1",
    chainId: params.chainId ?? 1,
    nonce: params.nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(
      Date.now() + (params.expirationMinutes ?? 5) * 60 * 1000
    ).toISOString(),
  });

  return message.prepareMessage();
}

/**
 * Verify a signed SIWA message and extract the wallet address.
 */
export async function verifySiwaMessage(
  params: SiwaVerifyParams
): Promise<SiwaVerifyResult> {
  try {
    const siweMessage = new SiweMessage(params.message);
    const result = await siweMessage.verify({
      signature: params.signature,
      domain: params.expectedDomain,
    });

    if (!result.success) {
      return { success: false, error: "Signature verification failed" };
    }

    // Verify URI if expected value provided
    if (params.expectedUri && result.data.uri !== params.expectedUri) {
      return { success: false, error: "URI mismatch" };
    }

    return {
      success: true,
      address: result.data.address,
      nonce: result.data.nonce,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Generate a cryptographically random nonce for SIWA.
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
