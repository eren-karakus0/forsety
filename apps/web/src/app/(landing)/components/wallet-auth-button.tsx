"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useForsetyAuth } from "@/lib/auth-client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@forsety/ui";
import { ArrowRight, Loader2, AlertTriangle, X } from "lucide-react";
import { WalletSelector } from "@/components/wallet-selector";
import { useSession } from "./session-context";

interface WalletAuthButtonProps {
  size?: "sm" | "lg" | "default";
  children?: ReactNode;
  className?: string;
  autoOpen?: boolean;
}

export function WalletAuthButton({
  size = "default",
  children,
  className,
  autoOpen = false,
}: WalletAuthButtonProps) {
  const { connected } = useWallet();
  const { isAuthenticated, isLoading, error, signIn } = useForsetyAuth();
  const { refresh } = useSession();
  const router = useRouter();
  const pendingAuth = useRef(false);

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  const isSameDomain = !appDomain;
  const dashboardUrl = appDomain
    ? `https://${appDomain}/dashboard`
    : "/dashboard";
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const autoOpened = useRef(false);
  const [dismissedError, setDismissedError] = useState(false);

  // When wallet modal closes without connecting, allow re-opening
  const handleModalChange = (open: boolean) => {
    setWalletModalOpen(open);
    if (!open && !connected) {
      pendingAuth.current = false;
    }
  };

  // Reset dismissed state when a new error appears
  useEffect(() => {
    if (error) setDismissedError(false);
  }, [error]);

  // Auto-dismiss error after 8 seconds
  useEffect(() => {
    if (error && !dismissedError) {
      const timer = setTimeout(() => setDismissedError(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [error, dismissedError]);

  // Auto-open wallet selector on mount (when user clicked the launch button)
  useEffect(() => {
    if (autoOpen && !autoOpened.current && !connected && !isAuthenticated) {
      autoOpened.current = true;
      pendingAuth.current = true;
      setWalletModalOpen(true);
    }
  }, [autoOpen, connected, isAuthenticated]);

  // After wallet connects, auto-trigger sign-in
  useEffect(() => {
    if (connected && pendingAuth.current && !isAuthenticated && !isLoading) {
      pendingAuth.current = false;
      signIn();
    }
  }, [connected, isAuthenticated, isLoading, signIn]);

  // Redirect on successful auth and refresh session context
  useEffect(() => {
    if (isAuthenticated) {
      refresh();
      if (isSameDomain) {
        router.push("/dashboard?fresh=1");
      } else {
        window.location.href = dashboardUrl;
      }
    }
  }, [isAuthenticated, dashboardUrl, isSameDomain, refresh, router]);

  const handleClick = () => {
    if (isAuthenticated) {
      if (isSameDomain) {
        router.push("/dashboard?fresh=1");
      } else {
        window.location.href = dashboardUrl;
      }
      return;
    }
    if (!connected) {
      pendingAuth.current = true;
      setWalletModalOpen(true);
      return;
    }
    signIn();
  };

  const showError = error && !dismissedError;

  if (isLoading) {
    return (
      <Button size={size} disabled className={className}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Signing in...
      </Button>
    );
  }

  return (
    <>
      {showError && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
            <button
              onClick={() => {
                setDismissedError(true);
                signIn();
              }}
              className="mt-1 text-xs font-medium text-red-300 underline underline-offset-2 hover:text-red-200"
            >
              Try Again
            </button>
          </div>
          <button
            onClick={() => setDismissedError(true)}
            className="shrink-0 text-red-400 hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <Button size={size} onClick={handleClick} className={className}>
        {children ?? (
          <>
            Launch App
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      <WalletSelector
        open={walletModalOpen}
        onOpenChange={handleModalChange}
      />
    </>
  );
}
