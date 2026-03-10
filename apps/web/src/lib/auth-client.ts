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

    // Guard: publicKey must be available and non-empty
    const pubKeyStr = account.publicKey?.toString();
    if (!pubKeyStr || pubKeyStr.length < 10) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: "Wallet did not provide a public key. Please reconnect your wallet.",
      });
      return;
    }

    setAuthState({ isAuthenticated: false, isLoading: true, error: null });

    try {
      const address = account.address.toString();

      // 1. Get nonce and pre-built message from server
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`, {
        credentials: "include",
      });
      if (!nonceRes.ok) {
        const nonceData = await nonceRes.json().catch(() => ({}));
        throw new Error(nonceData.error ?? `Nonce request failed (${nonceRes.status})`);
      }
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

      // 3. Normalize signature to hex string
      let signatureHex: string;
      if (typeof signResult.signature === "string") {
        signatureHex = signResult.signature;
      } else if (signResult.signature instanceof Uint8Array) {
        signatureHex = Array.from(signResult.signature, (b) =>
          b.toString(16).padStart(2, "0")
        ).join("");
      } else if (Array.isArray(signResult.signature)) {
        signatureHex = signResult.signature[0] as string;
      } else {
        signatureHex = signResult.signature.toString();
      }

      // 4. Verify on server - send fullMessage, signature, and publicKey
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullMessage: signResult.fullMessage,
          signature: signatureHex,
          publicKey: pubKeyStr,
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
