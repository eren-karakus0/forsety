import { describe, it, expect } from "vitest";
import { createSiwaMessage, generateNonce } from "../src/siwa.js";

describe("SIWA", () => {
  describe("generateNonce", () => {
    it("should generate a 32-character hex nonce", () => {
      const nonce = generateNonce();
      expect(nonce).toHaveLength(32);
      expect(/^[0-9a-f]+$/.test(nonce)).toBe(true);
    });

    it("should generate unique nonces", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe("createSiwaMessage", () => {
    it("should create a valid EIP-4361 message", () => {
      const message = createSiwaMessage({
        domain: "forsety.app",
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        nonce: generateNonce(),
      });

      expect(message).toContain("forsety.app");
      expect(message).toContain("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
      expect(message).toContain("Sign in with your wallet to access Forsety");
      expect(message).toContain("Version: 1");
      expect(message).toContain("Chain ID: 1");
    });

    it("should accept custom statement and chainId", () => {
      const message = createSiwaMessage({
        domain: "forsety.app",
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        nonce: generateNonce(),
        chainId: 11155111,
        statement: "Custom statement",
      });

      expect(message).toContain("Custom statement");
      expect(message).toContain("Chain ID: 11155111");
    });

    it("should include expiration time", () => {
      const message = createSiwaMessage({
        domain: "forsety.app",
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        nonce: generateNonce(),
        expirationMinutes: 10,
      });

      expect(message).toContain("Expiration Time:");
    });
  });
});
