import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockVerifyJwt = vi.fn();
const mockGetEnv = vi.fn(() => ({ JWT_SECRET: "test-secret-64-chars-long-for-entropy-validation-requirement-ok" }));

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: mockGet }),
}));

vi.mock("@forsety/auth", () => ({
  verifyJwt: (...args: unknown[]) => mockVerifyJwt(...args),
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => mockGetEnv(),
}));

const { getWalletFromSession, withAuth } = await import("@/lib/with-auth");

describe("getWalletFromSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no auth cookie", async () => {
    mockGet.mockReturnValue(undefined);
    expect(await getWalletFromSession()).toBeNull();
  });

  it("returns wallet address from valid JWT", async () => {
    mockGet.mockReturnValue({ value: "valid-token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xABC", network: "testnet" });
    expect(await getWalletFromSession()).toBe("0xABC");
  });

  it("returns null for invalid JWT (no sub)", async () => {
    mockGet.mockReturnValue({ value: "bad-token" });
    mockVerifyJwt.mockResolvedValue({});
    expect(await getWalletFromSession()).toBeNull();
  });

  it("returns null for non-testnet network", async () => {
    mockGet.mockReturnValue({ value: "token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xABC", network: "mainnet" });
    expect(await getWalletFromSession()).toBeNull();
  });

  it("returns full session info when opts.full is true", async () => {
    mockGet.mockReturnValue({ value: "token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xDEF", network: "testnet" });
    const result = await getWalletFromSession({ full: true });
    expect(result).toEqual({ wallet: "0xDEF", network: "testnet" });
  });

  it("defaults network to testnet when not in JWT", async () => {
    mockGet.mockReturnValue({ value: "token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xGHI" });
    const result = await getWalletFromSession({ full: true });
    expect(result).toEqual({ wallet: "0xGHI", network: "testnet" });
  });
});

describe("withAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls handler with wallet when authenticated", async () => {
    mockGet.mockReturnValue({ value: "token" });
    mockVerifyJwt.mockResolvedValue({ sub: "0xABC", network: "testnet" });
    const handler = vi.fn().mockResolvedValue("result");
    const result = await withAuth(handler);
    expect(handler).toHaveBeenCalledWith("0xABC");
    expect(result).toBe("result");
  });

  it("throws when not authenticated and no fallback", async () => {
    mockGet.mockReturnValue(undefined);
    await expect(withAuth(vi.fn())).rejects.toThrow("Not authenticated");
  });

  it("returns fallback when not authenticated", async () => {
    mockGet.mockReturnValue(undefined);
    const result = await withAuth(vi.fn(), "fallback");
    expect(result).toBe("fallback");
  });
});

