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
  const freshHandled = useRef(false);

  // Fast-path: if redirected from auth with ?fresh=1, optimistically mark valid
  // and verify in background (non-blocking). This eliminates the skeleton flash
  // while still validating the session server-side.
  useEffect(() => {
    if (freshHandled.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("fresh") === "1" && connected && account) {
      freshHandled.current = true;
      // Optimistically show dashboard immediately
      setSessionValid(true);
      setSessionChecking(false);
      // Clean URL without triggering navigation
      window.history.replaceState({}, "", window.location.pathname);
      // Background validation — revoke if JWT is actually invalid
      fetch("/api/auth/session", { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data.authenticated !== true) {
            setSessionValid(false);
          }
        })
        .catch(() => {
          setSessionValid(false);
        });
    }
  }, [connected, account]);

  // Check server-side JWT session validity
  useEffect(() => {
    // Skip if fresh auth already handled
    if (freshHandled.current) return;

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
      freshHandled.current = false;
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
