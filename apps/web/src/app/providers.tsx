"use client";

import { type ReactNode } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { getWalletAdapterProps } from "@/lib/aptos-config";
import { useNetwork } from "@/lib/network-context";

export function Providers({ children }: { children: ReactNode }) {
  const { activeNetwork } = useNetwork();
  const walletProps = getWalletAdapterProps(activeNetwork);

  return (
    <AptosWalletAdapterProvider key={activeNetwork} {...walletProps}>
      {children}
    </AptosWalletAdapterProvider>
  );
}
