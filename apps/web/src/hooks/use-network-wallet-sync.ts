"use client";

import { useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getAptosNetwork, TESTNET_CHAIN_ID } from "@/lib/aptos-config";

/**
 * Syncs wallet extension network to Shelby Testnet on connect.
 * Skips if wallet is already on the correct chain.
 * Dependency uses chainId primitive to avoid re-triggers from object identity changes.
 */
export function useNetworkWalletSync(): null {
  const { connected, changeNetwork, network } = useWallet();
  const chainId = network?.chainId;

  useEffect(() => {
    if (!connected || !changeNetwork) return;
    if (chainId === TESTNET_CHAIN_ID) return;
    changeNetwork(getAptosNetwork()).catch((err) => {
      console.warn("[NetworkSync] Wallet network change failed:", err);
    });
  }, [connected, changeNetwork, chainId]);

  return null;
}
