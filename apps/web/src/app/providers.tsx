"use client";

import { type ReactNode, useEffect } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { getWalletAdapterProps, getAptosNetwork, TESTNET_CHAIN_ID } from "@/lib/aptos-config";

/** Syncs wallet extension network to Shelby Testnet on connect */
function NetworkWalletSync() {
  const { connected, changeNetwork, network } = useWallet();

  useEffect(() => {
    if (!connected || !changeNetwork) return;
    if (network?.chainId === TESTNET_CHAIN_ID) return;
    changeNetwork(getAptosNetwork()).catch((err) => {
      console.warn("[NetworkSync] Wallet network change failed:", err);
    });
  }, [connected, changeNetwork, network]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const walletProps = getWalletAdapterProps();

  return (
    <AptosWalletAdapterProvider {...walletProps}>
      <NetworkWalletSync />
      {children}
    </AptosWalletAdapterProvider>
  );
}
