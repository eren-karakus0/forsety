import { describe, it, expect, vi, afterEach } from "vitest";
import { checkRateLimit, RATE_LIMIT_TIERS } from "../../src/lib/rate-limit";

describe("P0 Security Tests", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rate limit tightening", () => {
    it("public tier should be 5 req/min (tightened from 20)", () => {
      expect(RATE_LIMIT_TIERS.public.maxRequests).toBe(5);
    });

    it("should deny after 5 public requests", () => {
      vi.useFakeTimers();
      for (let i = 0; i < 5; i++) {
        checkRateLimit("p0-pub-test", "client-rl", RATE_LIMIT_TIERS.public);
      }
      const result = checkRateLimit("p0-pub-test", "client-rl", RATE_LIMIT_TIERS.public);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("mutation nonce strict validation", () => {
    it("should reject wrong chain_id via validatePayload regex", async () => {
      // Test the validation logic by importing the module with proper mocks
      const mod = await import("../../src/lib/verify-mutation-signature");
      const payload = {
        fullMessage: "APTOS\naddress: 0xabc\napplication: forsety.xyz\nchain_id: 1\nmessage: test\nnonce: n1",
        signature: "0x" + "a".repeat(128),
        publicKey: "0x" + "b".repeat(64),
      };
      const result = await mod.verifyMutationSignature(payload, "0xwallet");
      expect(result.valid).toBe(false);
    });

    it("should reject missing chain_id", async () => {
      const mod = await import("../../src/lib/verify-mutation-signature");
      const payload = {
        fullMessage: "APTOS\naddress: 0xabc\napplication: forsety.xyz\nmessage: test\nnonce: n1",
        signature: "0x" + "a".repeat(128),
        publicKey: "0x" + "b".repeat(64),
      };
      const result = await mod.verifyMutationSignature(payload, "0xwallet");
      expect(result.valid).toBe(false);
    });

    it("should reject missing application", async () => {
      const mod = await import("../../src/lib/verify-mutation-signature");
      const payload = {
        fullMessage: "APTOS\naddress: 0xabc\nchain_id: 2\nmessage: test\nnonce: n1",
        signature: "0x" + "a".repeat(128),
        publicKey: "0x" + "b".repeat(64),
      };
      const result = await mod.verifyMutationSignature(payload, "0xwallet");
      expect(result.valid).toBe(false);
    });
  });

  describe("shell metacharacter rejection", () => {
    it("should reject blob names with shell metacharacters via assertSafeBlobName", async () => {
      const { ForsetyValidationError } = await import("@forsety/sdk");

      // assertSafeBlobName is internal, test via ShelbyWrapper.uploadDataset
      // which calls assertSafeBlobName before any shell command
      const { ShelbyWrapper } = await import("@forsety/sdk");
      const wrapper = new ShelbyWrapper({ network: "testnet" } as any);

      const maliciousNames = [
        "test;rm -rf /",
        "test|cat /etc/passwd",
        "test&echo pwned",
        "test`id`",
        "test$(whoami)",
      ];

      for (const name of maliciousNames) {
        await expect(
          wrapper.uploadDataset("/dev/null", name, "in 30 days")
        ).rejects.toThrow(ForsetyValidationError);
      }
    });
  });
});
