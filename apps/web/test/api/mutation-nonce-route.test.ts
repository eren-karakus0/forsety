import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies ---
const mockVerifyJwt = vi.fn();
const mockGenerateNonce = vi.fn();

vi.mock("@forsety/auth", () => ({
  verifyJwt: (...args: unknown[]) => mockVerifyJwt(...args),
  generateNonce: () => mockGenerateNonce(),
}));

const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();
const mockDbDelete = vi.fn();

vi.mock("@forsety/db", () => ({
  sessions: {
    walletAddress: "walletAddress",
    nonce: "nonce",
    expiresAt: "expiresAt",
  },
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    insert: mockDbInsert,
    select: mockDbSelect,
    delete: mockDbDelete,
  }),
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    DATABASE_URL: "postgres://test",
    JWT_SECRET: "test-jwt-secret",
    FORSETY_API_KEY: "test-api-key",
    FORSETY_HMAC_SECRET: "test-hmac-secret",
  }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const mockCookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockCookiesGet(...args),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

describe("GET /api/auth/mutation-nonce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateNonce.mockReturnValue("nonce-mutation-123");
    mockCookiesGet.mockReturnValue(undefined);
    // Default mock for db.delete chain (deterministic cleanup may fire)
    mockDbDelete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  it("should return 401 when no cookie present", async () => {
    const { GET } = await import("../../src/app/api/auth/mutation-nonce/route");

    const req = new NextRequest("http://localhost:3000/api/auth/mutation-nonce");

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Not authenticated");
  });

  it("should return 401 when JWT verification fails", async () => {
    mockCookiesGet.mockReturnValue({ value: "invalid-token" });
    mockVerifyJwt.mockResolvedValue(null);

    const { GET } = await import("../../src/app/api/auth/mutation-nonce/route");

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Invalid session");
  });

  it("should return 401 when JWT has no subject", async () => {
    mockCookiesGet.mockReturnValue({ value: "valid-token-no-sub" });
    mockVerifyJwt.mockResolvedValue({ iat: 1234567890 });

    const { GET } = await import("../../src/app/api/auth/mutation-nonce/route");

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Invalid session");
  });

  it("should return 429 when max active nonces reached", async () => {
    // Arrange
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xuser123" });

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 3 }]),
    });

    mockDbSelect.mockReturnValue({
      from: mockFrom,
    });

    const { GET } = await import("../../src/app/api/auth/mutation-nonce/route");

    // Act
    const res = await GET();
    const json = await res.json();

    // Assert
    expect(res.status).toBe(429);
    expect(json.error).toContain("Too many pending approvals");
  });

  it("should return nonce when authenticated and under limit", async () => {
    // Arrange
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xuser123" });

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    });

    mockDbSelect.mockReturnValue({
      from: mockFrom,
    });

    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const { GET } = await import("../../src/app/api/auth/mutation-nonce/route");

    // Act
    const res = await GET();
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.nonce).toBe("nonce-mutation-123");
    expect(mockDbInsert).toHaveBeenCalled();
  });

  it("should validate nonce format matches expected pattern", async () => {
    // Arrange
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xuser123" });
    mockGenerateNonce.mockReturnValue("abc123def456789");

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 0 }]),
    });

    mockDbSelect.mockReturnValue({
      from: mockFrom,
    });

    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const { GET } = await import("../../src/app/api/auth/mutation-nonce/route");

    // Act
    const res = await GET();
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.nonce).toBe("abc123def456789");
    expect(typeof json.nonce).toBe("string");
    expect(json.nonce.length).toBeGreaterThan(0);
  });

  it("should trigger probabilistic cleanup (~10% chance, fire-and-forget)", async () => {
    // Arrange
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xuser123" });

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    });

    mockDbSelect.mockReturnValue({
      from: mockFrom,
    });

    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const mockExecute = vi.fn().mockResolvedValue(undefined);
    const mockWhere = vi.fn().mockReturnValue({
      execute: mockExecute,
    });

    mockDbDelete.mockReturnValue({
      where: mockWhere,
    });

    const { GET } = await import("../../src/app/api/auth/mutation-nonce/route");

    // Force Math.random to return 0.05 (< 0.1 threshold) to trigger cleanup
    const mathRandomSpy = vi.spyOn(Math, "random").mockReturnValue(0.05);
    mockDbDelete.mockClear();
    await GET();
    expect(mockDbDelete).toHaveBeenCalledTimes(1);

    // Force Math.random to return 0.5 (> 0.1 threshold) to skip cleanup
    mathRandomSpy.mockReturnValue(0.5);
    mockDbDelete.mockClear();
    await GET();
    expect(mockDbDelete).not.toHaveBeenCalled();

    mathRandomSpy.mockRestore();
  });

  it("should normalize wallet address to lowercase", async () => {
    // Arrange
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xABC123DEF" });

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 0 }]),
    });

    mockDbSelect.mockReturnValue({
      from: mockFrom,
    });

    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockDbInsert.mockReturnValue({
      values: mockValues,
    });

    const { GET } = await import("../../src/app/api/auth/mutation-nonce/route");

    // Act
    await GET();

    // Assert - Should have called insert with lowercase address
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddress: "0xabc123def",
      })
    );
  });

  it("should set expiration 90 seconds in the future", async () => {
    // Arrange
    const now = Date.now();
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xuser123" });

    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 0 }]),
    });

    mockDbSelect.mockReturnValue({
      from: mockFrom,
    });

    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockDbInsert.mockReturnValue({
      values: mockValues,
    });

    const { GET } = await import("../../src/app/api/auth/mutation-nonce/route");

    // Act
    await GET();

    // Assert
    const callArgs = mockValues.mock.calls[0][0];
    const expiresAt = callArgs.expiresAt.getTime();
    const expectedExpiry = now + 90 * 1000;

    // Allow 1 second tolerance for test execution time
    expect(expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
    expect(expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
  });

  it("should return 500 on unexpected database error", async () => {
    // Arrange
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xuser123" });

    mockDbSelect.mockImplementation(() => {
      throw new Error("Database connection failed");
    });

    const { GET } = await import("../../src/app/api/auth/mutation-nonce/route");

    // Act
    const res = await GET();
    const json = await res.json();

    // Assert
    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to generate mutation nonce");
  });
});
