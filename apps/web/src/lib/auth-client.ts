"use client";

import { useCallback, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useForsetyAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  const signIn = useCallback(async () => {
    if (!address || !isConnected) return;

    setAuthState({ isAuthenticated: false, isLoading: true, error: null });

    try {
      // 1. Get nonce from server (pass wallet address for message binding)
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`);
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce, message } = await nonceRes.json();

      if (!nonce || !message) throw new Error("Invalid nonce response");

      // 2. Sign the SIWA message with wallet
      const signature = await signMessageAsync({ message });

      // 3. Verify signature on server
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature, address }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error ?? "Verification failed");
      }

      setAuthState({ isAuthenticated: true, isLoading: false, error: null });
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Sign in failed",
      });
    }
  }, [address, isConnected, signMessageAsync]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAuthState({ isAuthenticated: false, isLoading: false, error: null });
    }
  }, []);

  return {
    ...authState,
    signIn,
    signOut,
    address,
    isConnected,
  };
}
