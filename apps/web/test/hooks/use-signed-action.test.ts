import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock wallet adapter ─────────────────────────────────────
const mockSignMessage = vi.fn();
const mockChangeNetwork = vi.fn();
const mockUseWallet = vi.fn();

vi.mock("@aptos-labs/wallet-adapter-react", () => ({
  useWallet: () => mockUseWallet(),
}));

// ─── Mock wallet-utils ─────────────────────────────────────
const mockEnsureCorrectNetwork = vi.fn();
vi.mock("@/lib/wallet-utils", () => ({
  normalizeSignature: (sig: any) => (typeof sig === "string" ? sig : "hex"),
  ensureCorrectNetwork: (...args: any[]) => mockEnsureCorrectNetwork(...args),
}));

// ─── Mock React hooks ─────────────────────────────────────
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: (fn: any) => fn,
  };
});

// ─── Mock fetch ─────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const defaultAccount = {
  address: { toString: () => "0xabc123" },
  publicKey: { toString: () => "b".repeat(64) },
};

describe("useSignedAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangeNetwork.mockResolvedValue(undefined);
    mockEnsureCorrectNetwork.mockResolvedValue(undefined);
    mockUseWallet.mockReturnValue({
      signMessage: mockSignMessage,
      account: defaultAccount,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 2 },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ nonce: "nonce-123" }),
    });
    mockSignMessage.mockResolvedValue({
      signature: "sig-hex",
      fullMessage: "full-msg",
    });
  });

  it("should call ensureCorrectNetwork before signMessage", async () => {
    const callOrder: string[] = [];
    mockEnsureCorrectNetwork.mockImplementation(async () => {
      callOrder.push("ensureCorrectNetwork");
    });
    mockSignMessage.mockImplementation(async () => {
      callOrder.push("signMessage");
      return { signature: "sig", fullMessage: "msg" };
    });

    const { useSignedAction } = await import("@/hooks/use-signed-action");
    const { executeWithSignature } = useSignedAction();

    const serverAction = vi.fn().mockResolvedValue("result");
    await executeWithSignature("test action", serverAction);

    expect(callOrder).toEqual(["ensureCorrectNetwork", "signMessage"]);
  });

  it("should pass changeNetwork and network to ensureCorrectNetwork", async () => {
    const { useSignedAction } = await import("@/hooks/use-signed-action");
    const { executeWithSignature } = useSignedAction();

    await executeWithSignature("test", vi.fn().mockResolvedValue(undefined));

    expect(mockEnsureCorrectNetwork).toHaveBeenCalledWith(
      mockChangeNetwork,
      { chainId: 2 }
    );
  });

  it("should propagate ensureCorrectNetwork error (fail-closed)", async () => {
    mockEnsureCorrectNetwork.mockRejectedValue(
      new Error("Please switch your wallet to Aptos Testnet and try again.")
    );

    const { useSignedAction } = await import("@/hooks/use-signed-action");
    const { executeWithSignature } = useSignedAction();

    await expect(
      executeWithSignature("test", vi.fn())
    ).rejects.toThrow("Please switch your wallet to Aptos Testnet");

    expect(mockSignMessage).not.toHaveBeenCalled();
  });

  it("should complete full flow when network is correct", async () => {
    const { useSignedAction } = await import("@/hooks/use-signed-action");
    const { executeWithSignature } = useSignedAction();

    const serverAction = vi.fn().mockResolvedValue({ ok: true });
    const result = await executeWithSignature("upload dataset", serverAction);

    expect(result).toEqual({ ok: true });
    expect(serverAction).toHaveBeenCalledWith({
      fullMessage: "full-msg",
      signature: "sig-hex",
      publicKey: "b".repeat(64),
    });
  });
});
