"use client";

import { Component, type ReactNode, type ErrorInfo, useEffect } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@forsety/ui";
import { ArrowRight } from "lucide-react";
import { getWalletAdapterProps, getAptosNetwork, TESTNET_CHAIN_ID } from "@/lib/aptos-config";
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
