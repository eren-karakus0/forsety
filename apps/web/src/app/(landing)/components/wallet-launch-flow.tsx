"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@forsety/ui";
import { ArrowRight } from "lucide-react";
import { getWalletAdapterProps } from "@/lib/aptos-config";
import { useNetworkWalletSync } from "@/hooks/use-network-wallet-sync";
import { WalletAuthButton } from "./wallet-auth-button";

/** Catches wallet adapter errors (e.g. "Network not supported" on custom chains) */
class WalletErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Wallet adapter error caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/** Fallback when wallet adapter fails - retries by reloading */
function FallbackButton({
  size,
  children,
  className,
}: {
  size?: "sm" | "lg" | "default";
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Button size={size} className={className} onClick={() => window.location.reload()}>
      {children ?? (
        <>
          Launch App
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

function NetworkWalletSync() {
  useNetworkWalletSync();
  return null;
}

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
    <WalletErrorBoundary
      fallback={
        <FallbackButton size={size} className={className}>
          {children}
        </FallbackButton>
      }
    >
      <AptosWalletAdapterProvider {...walletProps} autoConnect={false}>
        <NetworkWalletSync />
        <WalletAuthButton size={size} className={className} autoOpen>
          {children}
        </WalletAuthButton>
      </AptosWalletAdapterProvider>
    </WalletErrorBoundary>
  );
}
