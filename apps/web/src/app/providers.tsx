"use client";

import { type ReactNode } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { getAptosNetwork, SHELBYNET_CONFIG, APTOS_NETWORK } from "@/lib/aptos-config";
import { Network } from "@aptos-labs/ts-sdk";

export function Providers({ children }: { children: ReactNode }) {
  const network = getAptosNetwork();

  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      optInWallets={["Petra", "OKX Wallet", "Nightly", "Backpack", "Bitget Wallet"]}
      dappConfig={{
        network,
        ...(network === Network.CUSTOM
          ? {
              aptosApiKeys: process.env.NEXT_PUBLIC_APTOS_API_KEY
                ? { [APTOS_NETWORK]: process.env.NEXT_PUBLIC_APTOS_API_KEY }
                : undefined,
              fullnode: SHELBYNET_CONFIG.fullnode,
            }
          : {}),
      }}
      onError={(error) => {
        console.error("Wallet adapter error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
