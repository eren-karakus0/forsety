import { describe, it, expect, vi } from "vitest";
import { signJwt, verifyJwt } from "../src/jwt.js";

const TEST_SECRET = "test-secret-key-for-jwt-signing-min32chars!!";

describe("JWT", () => {
  describe("signJwt", () => {
    it("should create a valid JWT token", async () => {
      const token = await signJwt("0x1234abcd", TEST_SECRET);
      expect(token).toBeDefined();
      expect(token.split(".")).toHaveLength(3);
    });

    it("should include nonce when provided", async () => {
      const token = await signJwt("0x1234abcd", TEST_SECRET, {
        nonce: "test-nonce-123",
      });
      const payload = await verifyJwt(token, TEST_SECRET);
      expect(payload?.nonce).toBe("test-nonce-123");
    });

    it("should include network when provided", async () => {
      const token = await signJwt("0x1234abcd", TEST_SECRET, {
        network: "testnet",
      });
      const payload = await verifyJwt(token, TEST_SECRET);
      expect(payload?.network).toBe("testnet");
    });

    it("should not include network when omitted", async () => {
      const token = await signJwt("0x1234abcd", TEST_SECRET);
      const payload = await verifyJwt(token, TEST_SECRET);
      expect(payload?.network).toBeUndefined();
    });
  });

  describe("verifyJwt", () => {
    it("should verify a valid token", async () => {
      const address = "0xAbCdEf1234567890";
      const token = await signJwt(address, TEST_SECRET);
      const payload = await verifyJwt(token, TEST_SECRET);

      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe(address);
      expect(payload!.iat).toBeDefined();
      expect(payload!.exp).toBeDefined();
      expect(payload!.exp).toBeGreaterThan(payload!.iat);
    });

    it("should return null for invalid token", async () => {
      const payload = await verifyJwt("invalid.token.here", TEST_SECRET);
      expect(payload).toBeNull();
    });

    it("should return null for wrong secret", async () => {
      const token = await signJwt("0x1234", TEST_SECRET);
      const payload = await verifyJwt(token, "wrong-secret-key-must-be-32chars!!");
      expect(payload).toBeNull();
    });

    it(
      "should return null for expired token",
      async () => {
        const token = await signJwt("0x1234", TEST_SECRET, {
          expiresIn: "1s",
        });
        // Wait for token to expire (jose needs real time)
        await new Promise((r) => setTimeout(r, 1500));
        const payload = await verifyJwt(token, TEST_SECRET);
        expect(payload).toBeNull();
      },
      5000
    );
  });
});
