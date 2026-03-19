"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { normalizeSignature, ensureCorrectNetwork } from "@/lib/wallet-utils";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useForsetyAuth() {
  const { account, connected, signMessage, changeNetwork, network } = useWallet();
  const chainId = network?.chainId;
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

      // 2. Ensure wallet is on correct network before signing
      await ensureCorrectNetwork(changeNetwork, { chainId });

      // 3. Sign with Aptos wallet - include address, application, chainId in envelope
      const signResult = await signMessage({
        message,
        nonce,
        address: true,
        application: true,
        chainId: true,
      });

      // 4. Normalize signature to hex string
      const signatureHex = normalizeSignature(signResult.signature);

      // 5. Verify on server
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
  }, [account, connected, signMessage, changeNetwork, chainId]);

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
