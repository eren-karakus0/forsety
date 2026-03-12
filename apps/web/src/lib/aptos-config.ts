import { Network } from "@aptos-labs/ts-sdk";

export type SupportedNetwork = "shelbynet" | "testnet" | "mainnet";

export const CHAIN_ID_MAP: Record<SupportedNetwork, number> = {
  mainnet: 1,
  testnet: 2,
  shelbynet: 110,
};

export const NETWORK_DISPLAY_NAMES: Record<SupportedNetwork, string> = {
  shelbynet: "Shelbynet",
  testnet: "Aptos Testnet",
  mainnet: "Aptos Mainnet",
};

const VALID_NETWORKS: readonly SupportedNetwork[] = ["shelbynet", "testnet", "mainnet"];

function validateNetwork(value: string): SupportedNetwork {
  if (VALID_NETWORKS.includes(value as SupportedNetwork)) {
    return value as SupportedNetwork;
  }
  console.warn(
    `[Forsety] Invalid NEXT_PUBLIC_APTOS_NETWORK="${value}". ` +
    `Valid: ${VALID_NETWORKS.join(", ")}. Falling back to "shelbynet".`
  );
  return "shelbynet";
}

export const APTOS_NETWORK: SupportedNetwork = validateNetwork(
  (process.env.NEXT_PUBLIC_APTOS_NETWORK as string) || "shelbynet"
);

export function getAptosNetwork(networkName?: string): Network {
  const name = networkName ?? APTOS_NETWORK;
  switch (name) {
    case "mainnet":
      return Network.MAINNET;
    case "testnet":
      return Network.TESTNET;
    case "shelbynet":
      return Network.SHELBYNET;
    default:
      return Network.SHELBYNET;
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
export function getWalletAdapterProps(networkName?: string) {
  const name = (networkName ?? APTOS_NETWORK) as SupportedNetwork;
  const network = getAptosNetwork(name);
  const isAptosConnectSupported = name !== "shelbynet";

  const baseWallets = [
    "Petra",
    "OKX Wallet",
    "Nightly",
    "Backpack",
    "Bitget Wallet",
  ] as const;

  const optInWallets = isAptosConnectSupported
    ? ([...baseWallets, "Continue with Google"] as const)
    : baseWallets;

  return {
    autoConnect: true,
    optInWallets,
    dappConfig: {
      network,
      ...(isAptosConnectSupported
        ? { aptosConnect: {} }
        : {}),
      ...(process.env.NEXT_PUBLIC_APTOS_API_KEY
        ? {
            aptosApiKeys: {
              [name]: process.env.NEXT_PUBLIC_APTOS_API_KEY,
            },
          }
        : {}),
    },
    onError: (error: Error) => {
      console.error("Wallet adapter error:", error);
    },
  };
}
