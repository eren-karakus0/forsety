"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type SessionStatus = "checking" | "authenticated" | "anonymous";

interface SessionState {
  status: SessionStatus;
  address: string | null;
}

const SessionContext = createContext<SessionState>({
  status: "checking",
  address: null,
});

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    status: "checking",
    address: null,
  });

  useEffect(() => {
    fetch("/api/auth/session")
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

  return (
    <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
  );
}
