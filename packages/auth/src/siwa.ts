import {
  Ed25519PublicKey,
  Ed25519Signature,
  AuthenticationKey,
} from "@aptos-labs/ts-sdk";
import type { AuthMessageParams, AuthVerifyParams, AuthVerifyResult } from "./types";

/**
 * Create the raw message string that will be passed to signMessage().
 * The wallet wraps this with the APTOS envelope (prefix, address, chain_id, etc.).
 * This is NOT the fullMessage — just the `message` field content.
 */
export function createAuthMessage(params: AuthMessageParams): string {
  const parts = [
    `${params.domain} wants you to sign in with your Aptos account.`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ];

  if (params.statement) {
    parts.splice(1, 0, params.statement);
  }

  if (params.uri) {
    parts.push(`URI: ${params.uri}`);
  }

  if (params.expirationMinutes) {
    const expiresAt = new Date(
      Date.now() + params.expirationMinutes * 60 * 1000
    ).toISOString();
    parts.push(`Expiration Time: ${expiresAt}`);
  }

  return parts.join("\n");
}

/**
 * Parse nonce from the APTOS fullMessage envelope.
 *
 * The wallet's fullMessage format is:
 *   APTOS
 *   address: 0x...
 *   chain_id: 110
 *   application: example.com
 *   nonce: <nonce>
 *   message: <message content>
 *
 * The nonce appears in two places:
 * 1. As a top-level `nonce:` field in the envelope
 * 2. Inside the `message:` content (our createAuthMessage puts "Nonce: ..." there)
 *
 * We parse from the envelope (top-level nonce field) for reliability.
 */
function parseNonceFromFullMessage(fullMessage: string): string | null {
  // Match the envelope nonce field (lowercase "nonce:" from APTOS standard)
  const envelopeMatch = fullMessage.match(/\nnonce:\s*([^\n]+)/);
  if (envelopeMatch) return envelopeMatch[1].trim();

  // Fallback: match "Nonce:" from our message content
  const contentMatch = fullMessage.match(/Nonce:\s*([^\n]+)/);
  return contentMatch ? contentMatch[1].trim() : null;
}

/**
 * Parse address from the APTOS fullMessage envelope.
 */
function parseAddressFromFullMessage(fullMessage: string): string | null {
  const match = fullMessage.match(/\naddress:\s*(0x[a-fA-F0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Parse application (domain) from the APTOS fullMessage envelope.
 */
function parseApplicationFromFullMessage(fullMessage: string): string | null {
  const match = fullMessage.match(/\napplication:\s*([^\n]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Parse chain_id from the APTOS fullMessage envelope.
 */
function parseChainIdFromFullMessage(fullMessage: string): number | null {
  const match = fullMessage.match(/\nchain_id:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Normalize a domain string for comparison.
 * Strips protocol prefix (https://, http://), default ports (:443, :80),
 * trailing slashes, and lowercases.
 */
function normalizeDomain(value: string): string {
  let d = value.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.replace(/:(443|80)$/, "");
  d = d.replace(/\/+$/, "");
  return d;
}

/**
 * Verify a signed Aptos auth message.
 *
 * The wallet's signMessage() returns a fullMessage in APTOS envelope format
 * and an Ed25519 signature over the UTF-8 bytes of that fullMessage.
 */
export function verifyAuthMessage(params: AuthVerifyParams): AuthVerifyResult {
  try {
    const { fullMessage, signature, publicKey: publicKeyHex } = params;

    // Validate the fullMessage starts with APTOS prefix
    if (!fullMessage.startsWith("APTOS\n")) {
      return { success: false, error: "Invalid message format: missing APTOS prefix" };
    }

    // Parse public key and signature
    const publicKey = new Ed25519PublicKey(publicKeyHex);
    const sig = new Ed25519Signature(signature);

    // Verify the Ed25519 signature against the fullMessage bytes
    const messageBytes = new TextEncoder().encode(fullMessage);
    const isValid = publicKey.verifySignature({
      message: messageBytes,
      signature: sig,
    });

    if (!isValid) {
      return { success: false, error: "Signature verification failed" };
    }

    // Derive address from public key
    const derivedAddress = AuthenticationKey.fromPublicKey({ publicKey })
      .derivedAddress()
      .toString();

    // Parse fields from the APTOS envelope
    const envelopeAddress = parseAddressFromFullMessage(fullMessage);
    const nonce = parseNonceFromFullMessage(fullMessage);
    const application = parseApplicationFromFullMessage(fullMessage);
    const chainId = parseChainIdFromFullMessage(fullMessage);

    if (!nonce) {
      return { success: false, error: "Nonce not found in message" };
    }

    // Validate address: envelope address must match derived address from public key
    if (envelopeAddress) {
      const normalizedEnvelope = envelopeAddress.toLowerCase();
      const normalizedDerived = derivedAddress.toLowerCase();
      if (normalizedEnvelope !== normalizedDerived) {
        return { success: false, error: "Envelope address does not match public key" };
      }
    }

    // Validate expectedAddress if provided
    if (params.expectedAddress) {
      const normalizedExpected = params.expectedAddress.toLowerCase();
      const normalizedDerived = derivedAddress.toLowerCase();
      if (normalizedExpected !== normalizedDerived) {
        return { success: false, error: "Address mismatch" };
      }
    }

    // Validate domain if expected — fail-closed when field is missing
    if (params.expectedDomain) {
      if (!application) {
        return { success: false, error: "Domain binding expected but not found in message" };
      }
      if (normalizeDomain(application) !== normalizeDomain(params.expectedDomain)) {
        return { success: false, error: "Domain mismatch" };
      }
    }

    // Validate chain ID if expected
    // - If chain_id IS present in envelope → strict match (reject on mismatch)
    // - If chain_id is MISSING from envelope:
    //     strictChainId=true  → reject (fail-closed)
    //     strictChainId=false → allow  (some wallets don't include it)
    if (params.expectedChainId !== undefined) {
      if (chainId === null && params.strictChainId) {
        return { success: false, error: "Chain ID binding expected but not found in message" };
      }
      if (chainId !== null && chainId !== params.expectedChainId) {
        return { success: false, error: "Chain ID mismatch" };
      }
    }

    return {
      success: true,
      address: envelopeAddress ?? derivedAddress,
      nonce,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Generate a cryptographically random nonce.
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
