import { Network } from "@aptos-labs/ts-sdk";

export const TESTNET_CHAIN_ID = 2;
export const NETWORK_DISPLAY_NAME = "Shelby Testnet";

export function getAptosNetwork(): Network {
  return Network.TESTNET;
}

/** Shared wallet adapter props - single source of truth for providers.tsx & wallet-launch-flow.tsx */
export function getWalletAdapterProps() {
  const network = getAptosNetwork();

  const optInWallets = [
    "Petra",
    "OKX Wallet",
    "Nightly",
    "Backpack",
    "Bitget Wallet",
    "Continue with Google",
  ] as const;

  return {
    autoConnect: true,
    optInWallets,
    dappConfig: {
      network,
      aptosConnect: {},
      ...(process.env.NEXT_PUBLIC_APTOS_API_KEY
        ? {
            aptosApiKeys: {
              testnet: process.env.NEXT_PUBLIC_APTOS_API_KEY,
            },
          }
        : {}),
    },
    onError: (error: Error) => {
      console.error("Wallet adapter error:", error);
    },
  };
}
