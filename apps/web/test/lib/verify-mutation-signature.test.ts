import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock dependencies ─────────────────────────────────────
const mockVerifyAuthMessage = vi.fn();
vi.mock("@forsety/auth", () => ({
  verifyAuthMessage: (opts: any) => mockVerifyAuthMessage(opts),
}));

const mockTransaction = vi.fn();
const mockSelect = vi.fn();
const mockDelete = vi.fn();
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    transaction: mockTransaction,
    select: mockSelect,
    delete: mockDelete,
  }),
}));

vi.mock("@forsety/db", () => ({
  sessions: { id: "id", nonce: "nonce", walletAddress: "wallet_address", expiresAt: "expires_at" },
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ DATABASE_URL: "postgres://test" }),
}));

import { verifyMutationSignature } from "../../src/lib/verify-mutation-signature";

const validPayload = {
  fullMessage:
    "APTOS\naddress: 0xabc123\napplication: forsety.xyz\nchain_id: 2\nmessage: Approve action: test\nnonce: nonce-123",
  signature: "0x" + "a".repeat(128),
  publicKey: "0x" + "b".repeat(64),
};

describe("verify-mutation-signature.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error for missing payload fields", async () => {
    const result = await verifyMutationSignature(
      { fullMessage: "", signature: "", publicKey: "" } as any,
      "0xwallet"
    );

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should return error for invalid message format (not starting with APTOS)", async () => {
    const payload = {
      ...validPayload,
      fullMessage: "INVALID\nmessage: test",
    };

    const result = await verifyMutationSignature(payload, "0xwallet");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("message format");
  });

  it("should return error for invalid signature hex", async () => {
    const payload = {
      ...validPayload,
      signature: "0xshort",
    };

    const result = await verifyMutationSignature(payload, "0xwallet");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("signature");
  });

  it("should return error for invalid public key hex", async () => {
    const payload = {
      ...validPayload,
      publicKey: "0xshort",
    };

    const result = await verifyMutationSignature(payload, "0xwallet");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("public key");
  });

  it("should return error for missing application binding", async () => {
    const payload = {
      ...validPayload,
      fullMessage: "APTOS\naddress: 0xabc123\nchain_id: 2\nmessage: test\nnonce: nonce-123",
    };

    const result = await verifyMutationSignature(payload, "0xwallet");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("application");
  });

  it("should return error for missing chain_id binding", async () => {
    const payload = {
      ...validPayload,
      fullMessage: "APTOS\naddress: 0xabc123\napplication: forsety.xyz\nmessage: test\nnonce: nonce-123",
    };

    const result = await verifyMutationSignature(payload, "0xwallet");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("chain");
  });

  it("should return error when signature verification fails", async () => {
    mockVerifyAuthMessage.mockReturnValue({
      success: false,
      error: "Invalid signature",
    });

    const result = await verifyMutationSignature(validPayload, "0xwallet");

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should return error when wallet address mismatch", async () => {
    mockVerifyAuthMessage.mockReturnValue({
      success: true,
      address: "0xdifferent-wallet",
      nonce: "nonce-123",
    });

    const result = await verifyMutationSignature(validPayload, "0xexpected-wallet");

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should return error when nonce not found (expired)", async () => {
    mockVerifyAuthMessage.mockReturnValue({
      success: true,
      address: "0xwallet",
      nonce: "nonce-expired",
    });

    mockTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              for: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        delete: vi.fn(),
      };
      return callback(mockTx);
    });

    const result = await verifyMutationSignature(validPayload, "0xwallet");

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should return valid for correct signature with all checks passing", async () => {
    mockVerifyAuthMessage.mockReturnValue({
      success: true,
      address: "0xwallet",
      nonce: "nonce-valid",
    });

    const mockFor = vi.fn().mockResolvedValue([{ id: "session-1" }]);
    mockTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              for: mockFor,
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      };
      return callback(mockTx);
    });

    const result = await verifyMutationSignature(validPayload, "0xwallet");

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    // Verify SELECT FOR UPDATE lock is used for atomic nonce consumption
    expect(mockFor).toHaveBeenCalledWith("update");
  });

  it("should handle case-insensitive wallet address comparison", async () => {
    mockVerifyAuthMessage.mockReturnValue({
      success: true,
      address: "0xWALLET",
      nonce: "nonce-case",
    });

    mockTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              for: vi.fn().mockResolvedValue([{ id: "session-2" }]),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      };
      return callback(mockTx);
    });

    const result = await verifyMutationSignature(validPayload, "0xwallet");

    expect(result.valid).toBe(true);
  });

  it("should sanitize error messages in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    mockVerifyAuthMessage.mockReturnValue({
      success: false,
      error: "Detailed crypto error",
    });

    const result = await verifyMutationSignature(validPayload, "0xwallet");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Mutation authentication failed");

    vi.unstubAllEnvs();
  });
});
