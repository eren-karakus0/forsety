"use client";

import { type ReactNode } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { getWalletAdapterProps } from "@/lib/aptos-config";

export function Providers({ children }: { children: ReactNode }) {
  const walletProps = getWalletAdapterProps();

  return (
    <AptosWalletAdapterProvider {...walletProps}>
      {children}
    </AptosWalletAdapterProvider>
  );
}
