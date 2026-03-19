import { describe, it, expect, vi } from "vitest";
import { Network } from "@aptos-labs/ts-sdk";

// Mock aptos-config
vi.mock("@/lib/aptos-config", () => ({
  getAptosNetwork: () => Network.TESTNET,
  TESTNET_CHAIN_ID: 2,
}));

import { ensureCorrectNetwork } from "@/lib/wallet-utils";

describe("ensureCorrectNetwork", () => {
  it("should skip when chainId is already correct", async () => {
    const changeNetwork = vi.fn().mockResolvedValue(undefined);

    await ensureCorrectNetwork(changeNetwork, { chainId: 2 });

    expect(changeNetwork).not.toHaveBeenCalled();
  });

  it("should call changeNetwork when chainId is wrong", async () => {
    const changeNetwork = vi.fn().mockResolvedValue(undefined);

    await ensureCorrectNetwork(changeNetwork, { chainId: 1 });

    expect(changeNetwork).toHaveBeenCalledWith(Network.TESTNET);
  });

  it("should continue when changeNetwork is undefined", async () => {
    await expect(
      ensureCorrectNetwork(undefined, { chainId: 1 })
    ).resolves.toBeUndefined();
  });

  it("should call changeNetwork when network is null", async () => {
    const changeNetwork = vi.fn().mockResolvedValue(undefined);

    await ensureCorrectNetwork(changeNetwork, null);

    expect(changeNetwork).toHaveBeenCalledWith(Network.TESTNET);
  });

  it("should throw actionable error when changeNetwork rejects", async () => {
    const changeNetwork = vi.fn().mockRejectedValue(new Error("Wallet rejected"));

    await expect(
      ensureCorrectNetwork(changeNetwork, { chainId: 1 })
    ).rejects.toThrow("Please switch your wallet to Aptos Testnet and try again.");

    expect(changeNetwork).toHaveBeenCalledWith(Network.TESTNET);
  });
});
