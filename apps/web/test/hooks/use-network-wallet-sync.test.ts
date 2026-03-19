import { describe, it, expect, vi, beforeEach } from "vitest";
import { Network } from "@aptos-labs/ts-sdk";

// ─── Mock wallet adapter ─────────────────────────────────────
const mockChangeNetwork = vi.fn();
const mockUseWallet = vi.fn();

vi.mock("@aptos-labs/wallet-adapter-react", () => ({
  useWallet: () => mockUseWallet(),
}));

// ─── Mock aptos-config ─────────────────────────────────────
vi.mock("@/lib/aptos-config", () => ({
  getAptosNetwork: () => Network.TESTNET,
  TESTNET_CHAIN_ID: 2,
}));

// ─── Capture useEffect callbacks ─────────────────────────────
let effectCallback: (() => void) | null = null;

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useEffect: (cb: () => void) => {
      effectCallback = cb;
    },
  };
});

describe("useNetworkWalletSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    effectCallback = null;
    mockChangeNetwork.mockResolvedValue(undefined);
  });

  it("should not call changeNetwork when chainId is already correct", async () => {
    mockUseWallet.mockReturnValue({
      connected: true,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 2 },
    });

    const { useNetworkWalletSync } = await import(
      "@/hooks/use-network-wallet-sync"
    );
    useNetworkWalletSync();
    effectCallback!();

    expect(mockChangeNetwork).not.toHaveBeenCalled();
  });

  it("should call changeNetwork once when chainId is wrong", async () => {
    mockUseWallet.mockReturnValue({
      connected: true,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 1 },
    });

    const { useNetworkWalletSync } = await import(
      "@/hooks/use-network-wallet-sync"
    );
    useNetworkWalletSync();
    effectCallback!();

    expect(mockChangeNetwork).toHaveBeenCalledTimes(1);
    expect(mockChangeNetwork).toHaveBeenCalledWith(Network.TESTNET);
  });

  it("should not call changeNetwork when not connected", async () => {
    mockUseWallet.mockReturnValue({
      connected: false,
      changeNetwork: mockChangeNetwork,
      network: { chainId: 1 },
    });

    const { useNetworkWalletSync } = await import(
      "@/hooks/use-network-wallet-sync"
    );
    useNetworkWalletSync();
    effectCallback!();

    expect(mockChangeNetwork).not.toHaveBeenCalled();
  });

  it("should not throw when changeNetwork is undefined", async () => {
    mockUseWallet.mockReturnValue({
      connected: true,
      changeNetwork: undefined,
      network: { chainId: 1 },
    });

    const { useNetworkWalletSync } = await import(
      "@/hooks/use-network-wallet-sync"
    );
    useNetworkWalletSync();

    expect(() => effectCallback!()).not.toThrow();
  });
});
