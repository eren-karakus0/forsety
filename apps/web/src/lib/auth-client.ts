"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useForsetyAuth() {
  const { account, connected, signMessage } = useWallet();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  const signIn = useCallback(async () => {
    if (!account?.address || !connected) return;

    setAuthState({ isAuthenticated: false, isLoading: true, error: null });

    try {
      const address = account.address.toString();

      // 1. Get nonce and pre-built message from server
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`, {
        credentials: "include",
      });
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce, message } = await nonceRes.json();

      if (!nonce || !message) throw new Error("Invalid nonce response");

      // 2. Sign with Aptos wallet - include address, application, chainId in envelope
      const signResult = await signMessage({
        message,
        nonce,
        address: true,
        application: true,
        chainId: true,
      });

      // 3. Verify on server - send fullMessage, signature, and publicKey
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullMessage: signResult.fullMessage,
          signature: typeof signResult.signature === "string"
            ? signResult.signature
            : Array.isArray(signResult.signature)
              ? signResult.signature[0]
              : signResult.signature.toString(),
          publicKey: account.publicKey?.toString() ?? "",
          address,
        }),
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
  }, [account, connected, signMessage]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      setAuthState({ isAuthenticated: false, isLoading: false, error: null });
    }
  }, []);

  return {
    ...authState,
    signIn,
    signOut,
    address: account?.address?.toString(),
    isConnected: connected,
  };
}
