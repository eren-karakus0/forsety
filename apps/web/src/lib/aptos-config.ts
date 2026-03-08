import { Network } from "@aptos-labs/ts-sdk";

export const APTOS_NETWORK =
  (process.env.NEXT_PUBLIC_APTOS_NETWORK as string) || "shelbynet";

export function getAptosNetwork(): Network {
  switch (APTOS_NETWORK) {
    case "mainnet":
      return Network.MAINNET;
    case "testnet":
      return Network.TESTNET;
    case "devnet":
      return Network.DEVNET;
    case "shelbynet":
      return Network.SHELBYNET;
    default:
      return Network.CUSTOM;
  }
}

export const SHELBYNET_CHAIN_ID = 110;

export const SHELBYNET_CONFIG = {
  name: "Shelbynet",
  chainId: SHELBYNET_CHAIN_ID,
  fullnode: "https://api.shelbynet.shelby.xyz/v1",
  faucet: "https://faucet.shelbynet.shelby.xyz",
};

/** Shared wallet adapter props - single source of truth for providers.tsx & wallet-launch-flow.tsx */
export function getWalletAdapterProps() {
  const network = getAptosNetwork();
  return {
    autoConnect: true,
    optInWallets: [
      "Petra",
      "OKX Wallet",
      "Nightly",
      "Backpack",
      "Bitget Wallet",
    ] as const,
    dappConfig: {
      network,
      ...(process.env.NEXT_PUBLIC_APTOS_API_KEY
        ? {
            aptosApiKeys: {
              [APTOS_NETWORK]: process.env.NEXT_PUBLIC_APTOS_API_KEY,
            },
          }
        : {}),
    },
    onError: (error: Error) => {
      console.error("Wallet adapter error:", error);
    },
  };
}
