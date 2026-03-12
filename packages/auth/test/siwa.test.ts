import { describe, it, expect } from "vitest";
import { createAuthMessage, verifyAuthMessage, generateNonce } from "../src/siwa.js";
import { Ed25519PrivateKey, AuthenticationKey } from "@aptos-labs/ts-sdk";

// Generate a test keypair with derived Aptos address
function createTestKeypair() {
  const privateKey = Ed25519PrivateKey.generate();
  const publicKey = privateKey.publicKey();
  const address = AuthenticationKey.fromPublicKey({ publicKey })
    .derivedAddress()
    .toString();
  return { privateKey, publicKey, address };
}

/**
 * Build an APTOS envelope fullMessage — simulates what a real wallet does
 * when signMessage({ message, nonce, address: true, application: true, chainId: true }) is called.
 *
 * Format:
 *   APTOS
 *   address: 0x...
 *   chain_id: 110
 *   application: forsety.app
 *   nonce: <nonce>
 *   message: <raw message content>
 */
function buildAptosEnvelope(params: {
  address: string;
  chainId: number;
  application: string;
  nonce: string;
  message: string;
}): string {
  return [
    "APTOS",
    `address: ${params.address}`,
    `chain_id: ${params.chainId}`,
    `application: ${params.application}`,
    `nonce: ${params.nonce}`,
    `message: ${params.message}`,
  ].join("\n");
}

describe("Aptos Auth", () => {
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

  describe("createAuthMessage", () => {
    it("should create a message with domain and nonce", () => {
      const message = createAuthMessage({
        domain: "forsety.app",
        address: "0x" + "a".repeat(64),
        nonce: "abc123",
      });

      expect(message).toContain("forsety.app wants you to sign in with your Aptos account.");
      expect(message).toContain("Nonce: abc123");
      expect(message).toContain("Issued At:");
    });

    it("should include custom statement", () => {
      const message = createAuthMessage({
        domain: "forsety.app",
        address: "0x" + "a".repeat(64),
        nonce: "abc123",
        statement: "Custom statement for testing",
      });

      expect(message).toContain("Custom statement for testing");
    });

    it("should include expiration time", () => {
      const message = createAuthMessage({
        domain: "forsety.app",
        address: "0x" + "a".repeat(64),
        nonce: "abc123",
        expirationMinutes: 10,
      });

      expect(message).toContain("Expiration Time:");
    });

    it("should include URI when provided", () => {
      const message = createAuthMessage({
        domain: "forsety.app",
        address: "0x" + "a".repeat(64),
        nonce: "abc123",
        uri: "https://forsety.app",
      });

      expect(message).toContain("URI: https://forsety.app");
    });
  });

  describe("verifyAuthMessage", () => {
    it("should verify a valid APTOS envelope signature", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      // Build APTOS envelope (simulates what wallet does)
      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 110,
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      // Sign the full envelope (wallet signs the entire APTOS-prefixed message)
      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedAddress: address,
      });

      expect(result.success).toBe(true);
      expect(result.address).toBe(address);
      expect(result.nonce).toBe(nonce);
    });

    it("should reject message without APTOS prefix", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const rawMessage = "plain message without envelope";
      const messageBytes = new TextEncoder().encode(rawMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage: rawMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid message format: missing APTOS prefix");
    });

    it("should reject an invalid signature", () => {
      const { publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 110,
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      // Sign with a DIFFERENT private key (invalid signature for this public key)
      const otherPrivateKey = Ed25519PrivateKey.generate();
      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = otherPrivateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Signature verification failed");
    });

    it("should reject envelope address mismatch", () => {
      const { privateKey, publicKey } = createTestKeypair();
      const { address: otherAddress } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address: otherAddress,
        nonce,
      });

      // Envelope has otherAddress but signature is from first keypair
      const fullMessage = buildAptosEnvelope({
        address: otherAddress,
        chainId: 110,
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Envelope address does not match public key");
    });

    it("should reject expectedAddress mismatch", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const { address: otherAddress } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 110,
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedAddress: otherAddress, // Different from actual signer
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Address mismatch");
    });

    it("should validate domain from APTOS envelope", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 110,
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedDomain: "evil.com", // Does not match "forsety.app" in envelope
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Domain mismatch");
    });

    it("should validate chain ID from APTOS envelope", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 1, // Mainnet
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedChainId: 110, // Shelbynet — mismatch
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Chain ID mismatch");
    });

    it("should reject when expectedDomain is set but application field is missing", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      // Build envelope WITHOUT application field
      const fullMessage = [
        "APTOS",
        `address: ${address}`,
        `chain_id: 110`,
        `nonce: ${nonce}`,
        `message: ${rawMessage}`,
      ].join("\n");

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedDomain: "forsety.app",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Domain binding expected but not found in message");
    });

    it("should allow when expectedChainId is set but chain_id field is missing (lenient)", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      // Build envelope WITHOUT chain_id field
      const fullMessage = [
        "APTOS",
        `address: ${address}`,
        `application: forsety.app`,
        `nonce: ${nonce}`,
        `message: ${rawMessage}`,
      ].join("\n");

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedChainId: 110,
        // strictChainId defaults to false (lenient)
      });

      // Lenient: missing chain_id is allowed, only mismatched chain_id is rejected
      expect(result.success).toBe(true);
      expect(result.address).toBe(address);
      expect(result.nonce).toBe(nonce);
    });

    it("should reject when chain_id is missing and strictChainId=true", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      // Build envelope WITHOUT chain_id field
      const fullMessage = [
        "APTOS",
        `address: ${address}`,
        `application: forsety.app`,
        `nonce: ${nonce}`,
        `message: ${rawMessage}`,
      ].join("\n");

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedChainId: 110,
        strictChainId: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Chain ID binding expected but not found in message");
    });

    it("should match domain with protocol prefix (https://example.com vs example.com)", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.vercel.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 110,
        application: "https://forsety.vercel.app",
        nonce,
        message: rawMessage,
      });

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedDomain: "forsety.vercel.app",
      });

      expect(result.success).toBe(true);
    });

    it("should match domain with default port (example.com:443 vs example.com)", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 110,
        application: "forsety.app:443",
        nonce,
        message: rawMessage,
      });

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedDomain: "forsety.app",
      });

      expect(result.success).toBe(true);
    });

    it("should still reject truly different domains after normalization", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 110,
        application: "https://evil.com",
        nonce,
        message: rawMessage,
      });

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedDomain: "forsety.app",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Domain mismatch");
    });

    it("should pass when domain and chain ID match", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 110,
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedAddress: address,
        expectedDomain: "forsety.app",
        expectedChainId: 110,
      });

      expect(result.success).toBe(true);
      expect(result.address).toBe(address);
      expect(result.nonce).toBe(nonce);
    });

    it("should verify with chain_id=1 (mainnet)", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 1,
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedChainId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.address).toBe(address);
    });

    it("should verify with chain_id=2 (testnet)", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 2,
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedChainId: 2,
      });

      expect(result.success).toBe(true);
      expect(result.address).toBe(address);
    });

    it("should reject chain_id mismatch across networks", () => {
      const { privateKey, publicKey, address } = createTestKeypair();
      const nonce = generateNonce();
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      // Envelope says chain_id=2 (testnet)
      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 2,
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      const messageBytes = new TextEncoder().encode(fullMessage);
      const signature = privateKey.sign(messageBytes);

      // But we expect chain_id=1 (mainnet)
      const result = verifyAuthMessage({
        fullMessage,
        signature: signature.toString(),
        publicKey: publicKey.toString(),
        expectedChainId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Chain ID mismatch");
    });

    it("should reject non-Ed25519 key without crashing", () => {
      const nonce = generateNonce();
      const address = "0x" + "ab".repeat(32);
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 2,
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      // Non-Ed25519 key and sig (longer than standard)
      const fakePubKey = "ab".repeat(48); // 96 hex chars — not 64
      const fakeSig = "cd".repeat(96);    // 192 hex chars — not 128

      const result = verifyAuthMessage({
        fullMessage,
        signature: fakeSig,
        publicKey: fakePubKey,
        expectedAddress: address,
      });

      // Must reject — no local verification possible for non-Ed25519
      expect(result.success).toBe(false);
      expect(result.error).toContain("Non-Ed25519");
    });

    it("should reject short non-Ed25519 key without crashing", () => {
      const nonce = generateNonce();
      const address = "0x" + "ab".repeat(32);
      const rawMessage = createAuthMessage({
        domain: "forsety.app",
        address,
        nonce,
      });

      const fullMessage = buildAptosEnvelope({
        address,
        chainId: 2,
        application: "forsety.app",
        nonce,
        message: rawMessage,
      });

      // Very short — should still reject gracefully, not crash
      const result = verifyAuthMessage({
        fullMessage,
        signature: "abcd",
        publicKey: "1234",
        expectedAddress: address,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Non-Ed25519");
    });
  });
});
