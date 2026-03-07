import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import {
  encrypt,
  decrypt,
  isEncryptedPayload,
} from "../../src/crypto/aes.js";

describe("AES-256-GCM", () => {
  const key = randomBytes(32);

  describe("encrypt", () => {
    it("should return an encrypted payload", () => {
      const payload = encrypt("hello world", key);

      expect(payload._encrypted).toBe(true);
      expect(payload.ciphertext).toBeDefined();
      expect(payload.iv).toBeDefined();
      expect(payload.tag).toBeDefined();
      expect(payload.v).toBe(1);
    });

    it("should produce different ciphertext for same input (unique IV)", () => {
      const p1 = encrypt("same data", key);
      const p2 = encrypt("same data", key);

      expect(p1.ciphertext).not.toBe(p2.ciphertext);
      expect(p1.iv).not.toBe(p2.iv);
    });
  });

  describe("decrypt", () => {
    it("should decrypt to original data", () => {
      const original = JSON.stringify({ secret: "value", num: 42 });
      const payload = encrypt(original, key);
      const decrypted = decrypt(payload, key);

      expect(decrypted).toBe(original);
      expect(JSON.parse(decrypted)).toEqual({ secret: "value", num: 42 });
    });

    it("should throw with wrong key", () => {
      const payload = encrypt("secret data", key);
      const wrongKey = randomBytes(32);

      expect(() => decrypt(payload, wrongKey)).toThrow();
    });

    it("should throw with tampered ciphertext", () => {
      const payload = encrypt("secret data", key);
      payload.ciphertext = Buffer.from("tampered").toString("base64");

      expect(() => decrypt(payload, key)).toThrow();
    });

    it("should throw with tampered tag", () => {
      const payload = encrypt("secret data", key);
      payload.tag = randomBytes(16).toString("base64");

      expect(() => decrypt(payload, key)).toThrow();
    });
  });

  describe("isEncryptedPayload", () => {
    it("should return true for encrypted payload", () => {
      const payload = encrypt("test", key);
      expect(isEncryptedPayload(payload)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isEncryptedPayload(null)).toBe(false);
    });

    it("should return false for plain object", () => {
      expect(isEncryptedPayload({ data: "hello" })).toBe(false);
    });

    it("should return false for partial payload", () => {
      expect(
        isEncryptedPayload({ _encrypted: true, ciphertext: "abc" })
      ).toBe(false);
    });
  });
});
