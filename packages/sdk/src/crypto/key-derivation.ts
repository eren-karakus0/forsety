import { hkdfSync } from "node:crypto";

const DERIVATION_INFO = "Forsety ShieldStore Key Derivation v1";
const KEY_LENGTH = 32; // 256 bits for AES-256

/**
 * Derive an AES-256 key from a wallet signature using HKDF-SHA256.
 *
 * The wallet signs a fixed message: "Forsety ShieldStore Key Derivation v1"
 * The resulting signature is used as input key material for HKDF.
 * The derived key never leaves the client — server never sees it.
 */
export function deriveKey(walletSignature: Uint8Array): Buffer {
  // Use HKDF to derive a fixed-length key from the signature
  const salt = Buffer.from("forsety-shieldstore-salt-v1", "utf-8");
  const info = Buffer.from(DERIVATION_INFO, "utf-8");

  const derivedKey = hkdfSync(
    "sha256",
    Buffer.from(walletSignature),
    salt,
    info,
    KEY_LENGTH
  );

  return Buffer.from(derivedKey);
}

/**
 * Derive a key from a hex-encoded signature string.
 * Convenience wrapper for wallet signatures that come as hex.
 */
export function deriveKeyFromHex(signatureHex: string): Buffer {
  const cleanHex = signatureHex.startsWith("0x")
    ? signatureHex.slice(2)
    : signatureHex;
  return deriveKey(Buffer.from(cleanHex, "hex"));
}

/**
 * The message to be signed by the wallet for key derivation.
 */
export const KEY_DERIVATION_MESSAGE = DERIVATION_INFO;
