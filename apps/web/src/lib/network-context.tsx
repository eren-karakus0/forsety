"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  type SupportedNetwork,
  CHAIN_ID_MAP,
  NETWORK_DISPLAY_NAMES,
  APTOS_NETWORK,
} from "./aptos-config";

const STORAGE_KEY = "forsety-network";

function isValidNetwork(value: string): value is SupportedNetwork {
  return value === "testnet" || value === "mainnet";
}

interface NetworkContextValue {
  activeNetwork: SupportedNetwork;
  setNetwork: (network: SupportedNetwork) => void;
  chainId: number;
  isAptosConnectSupported: boolean;
  networkDisplayName: string;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Always start with env default — matches server render, prevents hydration mismatch
  const [activeNetwork, setActiveNetwork] = useState<SupportedNetwork>(APTOS_NETWORK);

  // After mount, sync from localStorage (client-only, no SSR conflict)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isValidNetwork(stored) && stored !== APTOS_NETWORK) {
        setActiveNetwork(stored);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setNetwork = useCallback(async (network: SupportedNetwork) => {
    try {
      localStorage.setItem(STORAGE_KEY, network);
    } catch {
      // ignore
    }

    // Logout to clear JWT (clean state on network switch)
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }

    setActiveNetwork(network);
  }, []);

  const value: NetworkContextValue = {
    activeNetwork,
    setNetwork,
    chainId: CHAIN_ID_MAP[activeNetwork],
    isAptosConnectSupported: true,
    networkDisplayName: NETWORK_DISPLAY_NAMES[activeNetwork],
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return ctx;
}
