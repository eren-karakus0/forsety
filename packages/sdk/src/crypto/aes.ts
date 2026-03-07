import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 16; // 128 bits

export interface EncryptedPayload {
  _encrypted: true;
  ciphertext: string; // Base64
  iv: string; // Base64
  tag: string; // Base64
  v: number; // Version for future algorithm upgrades
}

/**
 * Encrypt data using AES-256-GCM.
 * Returns an encrypted payload with ciphertext, IV, and auth tag.
 */
export function encrypt(
  data: string,
  key: Buffer
): EncryptedPayload {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(data, "utf-8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    _encrypted: true,
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    v: 1,
  };
}

/**
 * Decrypt an AES-256-GCM encrypted payload.
 * Throws if the key is wrong or data is tampered.
 */
export function decrypt(
  payload: EncryptedPayload,
  key: Buffer
): string {
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}

/**
 * Check if a value is an encrypted payload.
 */
export function isEncryptedPayload(
  value: unknown
): value is EncryptedPayload {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj._encrypted === true &&
    typeof obj.ciphertext === "string" &&
    typeof obj.iv === "string" &&
    typeof obj.tag === "string" &&
    typeof obj.v === "number"
  );
}
