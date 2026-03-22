"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useForsetyAuth } from "./auth-client";

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  retrySignIn: () => void;
  guard: () => boolean;
  selectorOpen: boolean;
  setSelectorOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { connected, account } = useWallet();
  const {
    signIn,
    isAuthenticated: hasSignedIn,
    isLoading: signInLoading,
    error: signInError,
  } = useForsetyAuth();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
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
      setAuthError(null);
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
        });
        const data = await res.json();
        if (!cancelled && connected) {
          setSessionValid(data.authenticated === true);
          // If wallet connected but no JWT, auto sign-in (once)
          if (!data.authenticated && !signInAttempted.current) {
            signInAttempted.current = true;
            await signIn();
            // signIn error is captured in signInError state from useForsetyAuth
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
      setAuthError(null);
    }
  }, [hasSignedIn]);

  // Propagate signIn errors to auth context
  useEffect(() => {
    if (signInError) {
      setAuthError(signInError);
    }
  }, [signInError]);

  // Reset on disconnect
  useEffect(() => {
    if (!connected) {
      setSessionValid(false);
      setAuthError(null);
      signInAttempted.current = false;
      freshHandled.current = false;
    }
  }, [connected]);

  const isAuthenticated = connected && !!account && sessionValid;
  const isLoading = sessionChecking || signInLoading;

  const retrySignIn = useCallback(() => {
    signInAttempted.current = false;
    setAuthError(null);
    signIn();
  }, [signIn]);

  const guard = useCallback((): boolean => {
    if (isAuthenticated) return true;
    setSelectorOpen(true);
    return false;
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, error: authError, retrySignIn, guard, selectorOpen, setSelectorOpen }),
    [isAuthenticated, isLoading, authError, retrySignIn, guard, selectorOpen, setSelectorOpen],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
