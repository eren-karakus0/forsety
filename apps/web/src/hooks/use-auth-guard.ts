"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

export function useAuthGuard() {
  const { connected, account } = useWallet();
  const [selectorOpen, setSelectorOpen] = useState(false);

  const isAuthenticated = connected && !!account;

  const guard = useCallback((): boolean => {
    if (isAuthenticated) return true;
    setSelectorOpen(true);
    return false;
  }, [isAuthenticated]);

  return { isAuthenticated, guard, selectorOpen, setSelectorOpen };
}
