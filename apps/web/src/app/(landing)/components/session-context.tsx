"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type SessionStatus = "checking" | "authenticated" | "anonymous";

interface SessionState {
  status: SessionStatus;
  address: string | null;
  refresh: () => void;
}

const SessionContext = createContext<SessionState>({
  status: "checking",
  address: null,
  refresh: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: SessionStatus; address: string | null }>({
    status: "checking",
    address: null,
  });

  const checkSession = useCallback(() => {
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated === true) {
          setState({ status: "authenticated", address: data.address ?? null });
        } else {
          setState({ status: "anonymous", address: null });
        }
      })
      .catch(() => {
        setState({ status: "anonymous", address: null });
      });
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <SessionContext.Provider value={{ ...state, refresh: checkSession }}>
      {children}
    </SessionContext.Provider>
  );
}
