"use client";

import { type ReactNode } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { getWalletAdapterProps } from "@/lib/aptos-config";
import { useNetworkWalletSync } from "@/hooks/use-network-wallet-sync";

function NetworkWalletSync() {
  useNetworkWalletSync();
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
