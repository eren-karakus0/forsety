"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { TESTNET_CHAIN_ID, NETWORK_DISPLAY_NAME } from "./aptos-config";

interface NetworkContextValue {
  activeNetwork: "testnet";
  chainId: number;
  isAptosConnectSupported: boolean;
  networkDisplayName: string;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

const STATIC_VALUE: NetworkContextValue = {
  activeNetwork: "testnet",
  chainId: TESTNET_CHAIN_ID,
  isAptosConnectSupported: true,
  networkDisplayName: NETWORK_DISPLAY_NAME,
};

export function NetworkProvider({ children }: { children: ReactNode }) {
  return (
    <NetworkContext.Provider value={STATIC_VALUE}>
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
