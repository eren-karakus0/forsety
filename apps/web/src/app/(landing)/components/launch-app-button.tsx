"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useForsetyAuth } from "@/lib/auth-client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@forsety/ui";
import { ArrowRight, Loader2 } from "lucide-react";
import { WalletSelector } from "@/components/wallet-selector";

interface LaunchAppButtonProps {
  size?: "sm" | "lg" | "default";
  children?: React.ReactNode;
  className?: string;
}

export function LaunchAppButton({
  size = "default",
  children,
  className,
}: LaunchAppButtonProps) {
  const router = useRouter();
  const { connected } = useWallet();
  const { isAuthenticated, isLoading, signIn } = useForsetyAuth();
  const pendingAuth = useRef(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // After wallet connects via modal, auto-trigger sign-in
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
    // Connected but not yet authenticated — trigger sign-in
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
