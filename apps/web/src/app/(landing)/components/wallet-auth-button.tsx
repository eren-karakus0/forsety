"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useForsetyAuth } from "@/lib/auth-client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@forsety/ui";
import { ArrowRight, Loader2 } from "lucide-react";
import { WalletSelector } from "@/components/wallet-selector";

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
  const router = useRouter();
  const { connected } = useWallet();
  const { isAuthenticated, isLoading, signIn } = useForsetyAuth();
  const pendingAuth = useRef(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const autoOpened = useRef(false);

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

  // Redirect on successful auth
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleClick = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
      return;
    }
    if (!connected) {
      pendingAuth.current = true;
      setWalletModalOpen(true);
      return;
    }
    signIn();
  };

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
        onOpenChange={setWalletModalOpen}
      />
    </>
  );
}
