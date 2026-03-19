import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock wallet adapter ─────────────────────────────────────
const mockSignMessage = vi.fn();
const mockChangeNetwork = vi.fn().mockResolvedValue(undefined);
const mockUseWallet = vi.fn().mockReturnValue({
  account: null,
  connected: false,
  signMessage: mockSignMessage,
  changeNetwork: mockChangeNetwork,
  network: { chainId: 2 },
});

vi.mock("@aptos-labs/wallet-adapter-react", () => ({
  useWallet: () => mockUseWallet(),
}));

// ─── Mock React hooks ─────────────────────────────────────
let currentState: any = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

let stateSetterQueue: Array<() => void> = [];

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: (initialState: any) => {
      currentState = typeof initialState === "function" ? initialState() : initialState;
      const setState = (update: any) => {
        const newState = typeof update === "function" ? update(currentState) : update;
        currentState = newState;
        stateSetterQueue.forEach((fn) => fn());
        stateSetterQueue = [];
      };
      return [currentState, setState];
    },
    useCallback: (fn: any) => fn,
  };
});

// ─── Mock wallet-utils ─────────────────────────────────────
vi.mock("@/lib/wallet-utils", () => ({
  normalizeSignature: (sig: any) => {
    if (typeof sig === "string") return sig;
    if (sig instanceof Uint8Array) {
      return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
    }
    if (Array.isArray(sig)) return sig[0];
    return sig.toString();
  },
  ensureCorrectNetwork: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock fetch globally ─────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("useForsetyAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentState = {
      isAuthenticated: false,
      isLoading: false,
      error: null,
    };
    stateSetterQueue = [];
    mockUseWallet.mockReturnValue({
      account: null,
      connected: false,
      signMessage: mockSignMessage,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 2 },
    });
  });

  it("should not be authenticated by default", async () => {
    const { useForsetyAuth } = await import("@/lib/auth-client");
    const hook = useForsetyAuth();

    // Assert
    expect(hook.isAuthenticated).toBe(false);
    expect(hook.isLoading).toBe(false);
    expect(hook.error).toBe(null);
  });

  it("should complete full signIn flow successfully", async () => {
    // Arrange
    const mockAccount = {
      address: { toString: () => "0xabc123def456" },
      publicKey: { toString: () => "b".repeat(64) },
    };
    mockUseWallet.mockReturnValue({
      account: mockAccount,
      connected: true,
      signMessage: mockSignMessage,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 2 },
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nonce: "nonce-xyz", message: "Sign this message" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    mockSignMessage.mockResolvedValue({
      signature: "a".repeat(128),
      fullMessage: "full-message-envelope",
    });

    const { useForsetyAuth } = await import("@/lib/auth-client");
    const hook = useForsetyAuth();

    // Act
    await hook.signIn();

    // Assert
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "/api/auth/nonce?address=0xabc123def456",
      { credentials: "include" }
    );
    expect(mockSignMessage).toHaveBeenCalledWith({
      message: "Sign this message",
      nonce: "nonce-xyz",
      address: true,
      application: true,
      chainId: true,
    });
    expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fullMessage: "full-message-envelope",
        signature: "a".repeat(128),
        publicKey: "b".repeat(64),
        address: "0xabc123def456",
      }),
    });
    expect(currentState.isAuthenticated).toBe(true);
    expect(currentState.isLoading).toBe(false);
    expect(currentState.error).toBe(null);
  });

  it("should handle nonce request failure", async () => {
    // Arrange
    const mockAccount = {
      address: { toString: () => "0xabc123def456" },
      publicKey: { toString: () => "b".repeat(64) },
    };
    mockUseWallet.mockReturnValue({
      account: mockAccount,
      connected: true,
      signMessage: mockSignMessage,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 2 },
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    const { useForsetyAuth } = await import("@/lib/auth-client");
    const hook = useForsetyAuth();

    // Act
    await hook.signIn();

    // Assert
    expect(currentState.isAuthenticated).toBe(false);
    expect(currentState.isLoading).toBe(false);
    expect(currentState.error).toBe("Server error");
  });

  it("should normalize Uint8Array signature", async () => {
    // Arrange
    const mockAccount = {
      address: { toString: () => "0xabc123def456" },
      publicKey: { toString: () => "b".repeat(64) },
    };
    mockUseWallet.mockReturnValue({
      account: mockAccount,
      connected: true,
      signMessage: mockSignMessage,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 2 },
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nonce: "nonce-xyz", message: "Sign this message" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const uint8Sig = new Uint8Array([0x0a, 0xbc, 0xde, 0xf1]);
    mockSignMessage.mockResolvedValue({
      signature: uint8Sig,
      fullMessage: "full-message-envelope",
    });

    const { useForsetyAuth } = await import("@/lib/auth-client");
    const hook = useForsetyAuth();

    // Act
    await hook.signIn();

    // Assert
    const verifyCall = mockFetch.mock.calls[1];
    const body = JSON.parse(verifyCall[1].body);
    expect(body.signature).toBe("0abcdef1");
    expect(currentState.isAuthenticated).toBe(true);
  });

  it("should normalize Array signature", async () => {
    // Arrange
    const mockAccount = {
      address: { toString: () => "0xabc123def456" },
      publicKey: { toString: () => "b".repeat(64) },
    };
    mockUseWallet.mockReturnValue({
      account: mockAccount,
      connected: true,
      signMessage: mockSignMessage,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 2 },
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nonce: "nonce-xyz", message: "Sign this message" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    mockSignMessage.mockResolvedValue({
      signature: ["firstElement", "secondElement"],
      fullMessage: "full-message-envelope",
    });

    const { useForsetyAuth } = await import("@/lib/auth-client");
    const hook = useForsetyAuth();

    // Act
    await hook.signIn();

    // Assert
    const verifyCall = mockFetch.mock.calls[1];
    const body = JSON.parse(verifyCall[1].body);
    expect(body.signature).toBe("firstElement");
    expect(currentState.isAuthenticated).toBe(true);
  });

  it("should reject when wallet not connected", async () => {
    // Arrange
    const mockAccount = {
      address: { toString: () => "0xabc123def456" },
      publicKey: { toString: () => "b".repeat(64) },
    };
    mockUseWallet.mockReturnValue({
      account: mockAccount,
      connected: false, // Not connected
      signMessage: mockSignMessage,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 2 },
    });

    const { useForsetyAuth } = await import("@/lib/auth-client");
    const hook = useForsetyAuth();

    // Act
    await hook.signIn();

    // Assert
    expect(mockFetch).not.toHaveBeenCalled();
    expect(currentState.isAuthenticated).toBe(false);
  });

  it("should reject when no publicKey from wallet", async () => {
    // Arrange
    const mockAccount = {
      address: { toString: () => "0xabc123def456" },
      publicKey: { toString: () => "" }, // Empty public key
    };
    mockUseWallet.mockReturnValue({
      account: mockAccount,
      connected: true,
      signMessage: mockSignMessage,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 2 },
    });

    const { useForsetyAuth } = await import("@/lib/auth-client");
    const hook = useForsetyAuth();

    // Act
    await hook.signIn();

    // Assert
    expect(mockFetch).not.toHaveBeenCalled();
    expect(currentState.isAuthenticated).toBe(false);
    expect(currentState.error).toContain("public key");
  });

  it("should handle signOut correctly", async () => {
    // Arrange
    const mockAccount = {
      address: { toString: () => "0xabc123def456" },
      publicKey: { toString: () => "b".repeat(64) },
    };
    mockUseWallet.mockReturnValue({
      account: mockAccount,
      connected: true,
      signMessage: mockSignMessage,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 2 },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { useForsetyAuth } = await import("@/lib/auth-client");
    const hook = useForsetyAuth();

    // Act
    await hook.signOut();

    // Assert
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    expect(currentState.isAuthenticated).toBe(false);
    expect(currentState.isLoading).toBe(false);
    expect(currentState.error).toBe(null);
  });

  it("should set loading state during signIn", async () => {
    // Arrange
    const mockAccount = {
      address: { toString: () => "0xabc123def456" },
      publicKey: { toString: () => "b".repeat(64) },
    };
    mockUseWallet.mockReturnValue({
      account: mockAccount,
      connected: true,
      signMessage: mockSignMessage,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 2 },
    });

    let capturedLoadingState = false;
    mockFetch.mockImplementation(async () => {
      // Capture loading state during fetch
      capturedLoadingState = currentState.isLoading;
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: "Test error" }),
      };
    });

    const { useForsetyAuth } = await import("@/lib/auth-client");
    const hook = useForsetyAuth();

    // Act
    await hook.signIn();

    // Assert - loading state was true during fetch
    expect(capturedLoadingState).toBe(true);
    // Loading state is false after completion
    expect(currentState.isLoading).toBe(false);
  });
});
