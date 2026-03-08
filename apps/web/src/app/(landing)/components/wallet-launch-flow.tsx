"use client";

import { type ReactNode } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { getWalletAdapterProps } from "@/lib/aptos-config";
import { WalletAuthButton } from "./wallet-auth-button";

interface WalletLaunchFlowProps {
  size?: "sm" | "lg" | "default";
  children?: ReactNode;
  className?: string;
}

export function WalletLaunchFlow({
  size,
  children,
  className,
}: WalletLaunchFlowProps) {
  const walletProps = getWalletAdapterProps();

  return (
    <AptosWalletAdapterProvider {...walletProps}>
      <WalletAuthButton size={size} className={className} autoOpen>
        {children}
      </WalletAuthButton>
    </AptosWalletAdapterProvider>
  );
}
