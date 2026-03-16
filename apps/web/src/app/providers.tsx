"use client";

import { type ReactNode, useEffect } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { getWalletAdapterProps, getAptosNetwork } from "@/lib/aptos-config";
import { useNetwork } from "@/lib/network-context";

/** Syncs wallet extension network with app-selected network */
function NetworkWalletSync() {
  const { activeNetwork } = useNetwork();
  const { connected, changeNetwork } = useWallet();

  useEffect(() => {
    if (!connected || !changeNetwork) return;
    const target = getAptosNetwork(activeNetwork);
    changeNetwork(target).catch((err) => {
      console.warn("[NetworkSync] Wallet network change failed:", err);
    });
  }, [connected, activeNetwork, changeNetwork]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const { activeNetwork } = useNetwork();
  const walletProps = getWalletAdapterProps(activeNetwork);

  return (
    <AptosWalletAdapterProvider key={activeNetwork} {...walletProps}>
      <NetworkWalletSync />
      {children}
    </AptosWalletAdapterProvider>
  );
}
