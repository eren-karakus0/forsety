import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock dependencies ─────────────────────────────────────
const mockGenerateNonce = vi.fn().mockReturnValue("nonce-abc-123");
const mockCreateAuthMessage = vi.fn().mockReturnValue("auth-message-payload");
const mockVerifyAuthMessage = vi.fn();
const mockSignJwt = vi.fn().mockResolvedValue("jwt-token-abc");
const mockVerifyJwt = vi.fn();

vi.mock("@forsety/auth", () => ({
  generateNonce: () => mockGenerateNonce(),
  createAuthMessage: (opts: any) => mockCreateAuthMessage(opts),
  verifyAuthMessage: (opts: any) => mockVerifyAuthMessage(opts),
  signJwt: (...args: any[]) => mockSignJwt(...args),
  verifyJwt: (...args: any[]) => mockVerifyJwt(...args),
}));

const mockInsert = vi.fn();
const mockDelete = vi.fn();
vi.mock("@forsety/db", () => ({
  createDb: () => ({
    insert: mockInsert,
    delete: mockDelete,
  }),
  sessions: { walletAddress: "wallet_address", nonce: "nonce", expiresAt: "expires_at" },
  users: { walletAddress: "wallet_address" },
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    DATABASE_URL: "postgres://test",
    JWT_SECRET: "test-jwt-secret",
    FORSETY_API_KEY: "test-api-key",
    FORSETY_HMAC_SECRET: "test-hmac-secret",
  }),
}));

vi.mock("@/lib/aptos-config", () => ({
  CHAIN_ID_MAP: { shelbynet: 999, testnet: 2, mainnet: 1 },
  APTOS_NETWORK: "shelbynet",
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe("Auth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/auth/nonce", () => {
    it("should return nonce for valid address", async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const { GET } = await import("../../src/app/api/auth/nonce/route");

      const req = new NextRequest(
        "http://localhost:3000/api/auth/nonce?address=0xabc123def456",
        { headers: { host: "localhost:3000" } }
      );

      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.nonce).toBe("nonce-abc-123");
      expect(json.message).toBe("auth-message-payload");
    });

    it("should reject missing address", async () => {
      const { GET } = await import("../../src/app/api/auth/nonce/route");

      const req = new NextRequest(
        "http://localhost:3000/api/auth/nonce",
        { headers: { host: "localhost:3000" } }
      );

      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("should reject invalid address format", async () => {
      const { GET } = await import("../../src/app/api/auth/nonce/route");

      const req = new NextRequest(
        "http://localhost:3000/api/auth/nonce?address=not-hex",
        { headers: { host: "localhost:3000" } }
      );

      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/verify", () => {
    it("should return 400 for missing fields", async () => {
      const { POST } = await import("../../src/app/api/auth/verify/route");

      const req = new NextRequest("http://localhost:3000/api/auth/verify", {
        method: "POST",
        headers: { host: "localhost:3000", "content-type": "application/json" },
        body: JSON.stringify({ fullMessage: "msg" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid public key format", async () => {
      const { POST } = await import("../../src/app/api/auth/verify/route");

      const req = new NextRequest("http://localhost:3000/api/auth/verify", {
        method: "POST",
        headers: { host: "localhost:3000", "content-type": "application/json" },
        body: JSON.stringify({
          fullMessage: "msg",
          signature: "a".repeat(128),
          publicKey: "short",
          address: "0xabc",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("public key");
    });

    it("should return 401 for failed verification", async () => {
      mockVerifyAuthMessage.mockReturnValue({ success: false, error: "Bad sig" });

      const { POST } = await import("../../src/app/api/auth/verify/route");

      const req = new NextRequest("http://localhost:3000/api/auth/verify", {
        method: "POST",
        headers: { host: "localhost:3000", "content-type": "application/json" },
        body: JSON.stringify({
          fullMessage: "msg",
          signature: "a".repeat(128),
          publicKey: "b".repeat(64),
          address: "0xabc",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 401 for expired nonce", async () => {
      mockVerifyAuthMessage.mockReturnValue({
        success: true,
        address: "0xabc",
        nonce: "nonce-123",
      });

      mockDelete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const { POST } = await import("../../src/app/api/auth/verify/route");

      const req = new NextRequest("http://localhost:3000/api/auth/verify", {
        method: "POST",
        headers: { host: "localhost:3000", "content-type": "application/json" },
        body: JSON.stringify({
          fullMessage: "msg",
          signature: "a".repeat(128),
          publicKey: "b".repeat(64),
          address: "0xabc",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("nonce");
    });
  });

  describe("GET /api/auth/session", () => {
    it("should return unauthenticated when no cookie", async () => {
      const { GET } = await import("../../src/app/api/auth/session/route");

      const req = new NextRequest("http://localhost:3000/api/auth/session");

      const res = await GET(req);
      const json = await res.json();

      expect(json.authenticated).toBe(false);
    });

    it("should return authenticated for valid JWT", async () => {
      mockVerifyJwt.mockResolvedValue({ sub: "0xabc123" });

      const { GET } = await import("../../src/app/api/auth/session/route");

      const req = new NextRequest("http://localhost:3000/api/auth/session", {
        headers: { cookie: "forsety-auth=valid-jwt-token" },
      });

      const res = await GET(req);
      const json = await res.json();

      expect(json.authenticated).toBe(true);
      expect(json.address).toBe("0xabc123");
    });

    it("should return unauthenticated for invalid JWT", async () => {
      mockVerifyJwt.mockResolvedValue(null);

      const { GET } = await import("../../src/app/api/auth/session/route");

      const req = new NextRequest("http://localhost:3000/api/auth/session", {
        headers: { cookie: "forsety-auth=invalid-jwt" },
      });

      const res = await GET(req);
      const json = await res.json();

      expect(json.authenticated).toBe(false);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should clear cookie and return success", async () => {
      const { POST } = await import("../../src/app/api/auth/logout/route");

      const req = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
      });

      const res = await POST();
      const json = await res.json();

      expect(json.success).toBe(true);

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("forsety-auth=");
      expect(setCookie).toContain("Max-Age=0");
    });
  });
});
