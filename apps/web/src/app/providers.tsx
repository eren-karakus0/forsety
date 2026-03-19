"use client";

import { type ReactNode, useEffect } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { getWalletAdapterProps, getAptosNetwork } from "@/lib/aptos-config";

/** Syncs wallet extension network to Shelby Testnet on connect */
function NetworkWalletSync() {
  const { connected, changeNetwork } = useWallet();

  useEffect(() => {
    if (!connected || !changeNetwork) return;
    changeNetwork(getAptosNetwork()).catch((err) => {
      console.warn("[NetworkSync] Wallet network change failed:", err);
    });
  }, [connected, changeNetwork]);

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
