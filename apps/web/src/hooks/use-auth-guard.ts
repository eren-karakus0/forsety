"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useForsetyAuth } from "@/lib/auth-client";

export function useAuthGuard() {
  const { connected, account } = useWallet();
  const { signIn, isAuthenticated: hasSignedIn, isLoading: signInLoading } = useForsetyAuth();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const signInAttempted = useRef(false);

  // Check server-side JWT session validity
  useEffect(() => {
    if (!connected || !account) {
      setSessionValid(false);
      setSessionChecking(false);
      signInAttempted.current = false;
      return;
    }

    let cancelled = false;

    async function checkSession() {
      setSessionChecking(true);
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const data = await res.json();
        if (!cancelled && connected) {
          setSessionValid(data.authenticated === true);
          // If wallet connected but no JWT, auto sign-in (once)
          if (!data.authenticated && !signInAttempted.current) {
            signInAttempted.current = true;
            await signIn();
          }
        }
      } catch {
        if (!cancelled) setSessionValid(false);
      } finally {
        if (!cancelled) setSessionChecking(false);
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [connected, account, signIn]);

  // When signIn succeeds, update session state
  useEffect(() => {
    if (hasSignedIn) {
      setSessionValid(true);
    }
  }, [hasSignedIn]);

  // Reset on disconnect
  useEffect(() => {
    if (!connected) {
      setSessionValid(false);
      signInAttempted.current = false;
    }
  }, [connected]);

  const isAuthenticated = connected && !!account && sessionValid;
  const isLoading = sessionChecking || signInLoading;

  const guard = useCallback((): boolean => {
    if (isAuthenticated) return true;
    setSelectorOpen(true);
    return false;
  }, [isAuthenticated]);

  return { isAuthenticated, isLoading, guard, selectorOpen, setSelectorOpen };
}
