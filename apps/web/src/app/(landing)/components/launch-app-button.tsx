"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Button } from "@forsety/ui";
import { ArrowRight, Loader2 } from "lucide-react";
import { useSession } from "./session-context";

// Lazy-load the wallet provider + auth flow - only fetched when user clicks
const WalletLaunchFlow = dynamic(
  () =>
    import("./wallet-launch-flow").then((mod) => ({
      default: mod.WalletLaunchFlow,
    })),
  { ssr: false }
);

interface LaunchAppButtonProps {
  size?: "sm" | "lg" | "default";
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function LaunchAppButton({
  size = "default",
  children,
  className,
  onClick,
}: LaunchAppButtonProps) {
  const { status } = useSession();
  const [activated, setActivated] = useState(false);

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  const dashboardUrl = appDomain
    ? `https://${appDomain}/dashboard`
    : "/dashboard";

  const handleClick = () => {
    onClick?.();
    // Fast-path: existing JWT session → skip wallet loading entirely
    if (status === "authenticated") {
      window.location.href = dashboardUrl;
      return;
    }
    // No session → activate wallet flow
    setActivated(true);
  };

  // Phase 2: Wallet provider loaded, auth flow active
  if (activated) {
    return (
      <WalletLaunchFlow size={size} className={className}>
        {children}
      </WalletLaunchFlow>
    );
  }

  // Phase 1: Plain button, no wallet dependency in bundle
  return (
    <Button
      size={size}
      onClick={handleClick}
      disabled={status === "checking"}
      className={className}
    >
      {status === "checking" ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {children ?? "Launch App"}
        </>
      ) : (
        children ?? (
          <>
            Launch App
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )
      )}
    </Button>
  );
}
