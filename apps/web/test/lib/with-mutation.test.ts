import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetWallet = vi.fn();
const mockVerifyMutation = vi.fn();
const mockGetClient = vi.fn();

vi.mock("@/lib/with-auth", () => ({
  getWalletFromSession: (...args: unknown[]) => mockGetWallet(...args),
}));

vi.mock("@/lib/verify-mutation-signature", () => ({
  verifyMutationSignature: (...args: unknown[]) => mockVerifyMutation(...args),
}));

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => mockGetClient(),
}));

const { withSignedMutation } = await import("@/lib/with-mutation");

const SIG = { nonce: "n1", signature: "0xsig", message: "msg" };

describe("withSignedMutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockGetWallet.mockResolvedValue(null);
    const result = await withSignedMutation(SIG, vi.fn());
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error when signature is invalid", async () => {
    mockGetWallet.mockResolvedValue("0xWallet");
    mockVerifyMutation.mockResolvedValue({ valid: false, error: "Bad sig" });
    const result = await withSignedMutation(SIG, vi.fn());
    expect(result).toEqual({ success: false, error: "Bad sig" });
  });

  it("returns success with handler result", async () => {
    mockGetWallet.mockResolvedValue("0xWallet");
    mockVerifyMutation.mockResolvedValue({ valid: true });
    const client = { datasets: {} };
    mockGetClient.mockReturnValue(client);
    const handler = vi.fn().mockResolvedValue({ id: "123" });

    const result = await withSignedMutation(SIG, handler);
    expect(result).toEqual({ success: true, id: "123" });
    expect(handler).toHaveBeenCalledWith("0xWallet", client);
  });

  it("returns error when handler throws", async () => {
    mockGetWallet.mockResolvedValue("0xWallet");
    mockVerifyMutation.mockResolvedValue({ valid: true });
    mockGetClient.mockReturnValue({});
    const handler = vi.fn().mockRejectedValue(new Error("DB error"));

    const result = await withSignedMutation(SIG, handler);
    expect(result).toEqual({ success: false, error: "DB error" });
  });

  it("returns generic error for non-Error throws", async () => {
    mockGetWallet.mockResolvedValue("0xWallet");
    mockVerifyMutation.mockResolvedValue({ valid: true });
    mockGetClient.mockReturnValue({});
    const handler = vi.fn().mockRejectedValue("string-error");

    const result = await withSignedMutation(SIG, handler);
    expect(result).toEqual({ success: false, error: "Operation failed" });
  });

  it("uses default error when sigCheck has no error message", async () => {
    mockGetWallet.mockResolvedValue("0xWallet");
    mockVerifyMutation.mockResolvedValue({ valid: false });
    const result = await withSignedMutation(SIG, vi.fn());
    expect(result).toEqual({ success: false, error: "Signature invalid" });
  });
});
