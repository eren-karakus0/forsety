"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { getWalletAdapterProps } from "@/lib/aptos-config";

export function Providers({ children }: { children: ReactNode }) {
  const walletProps = getWalletAdapterProps();

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AptosWalletAdapterProvider {...walletProps}>
        {children}
      </AptosWalletAdapterProvider>
    </ThemeProvider>
  );
}
