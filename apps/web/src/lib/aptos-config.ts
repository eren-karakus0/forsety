import { Network } from "@aptos-labs/ts-sdk";

export type SupportedNetwork = "testnet" | "mainnet";

export const CHAIN_ID_MAP: Record<SupportedNetwork, number> = {
  mainnet: 1,
  testnet: 2,
};

export const NETWORK_DISPLAY_NAMES: Record<SupportedNetwork, string> = {
  testnet: "Shelby Testnet",
  mainnet: "Aptos Mainnet",
};

const VALID_NETWORKS: readonly SupportedNetwork[] = ["testnet", "mainnet"];

function validateNetwork(value: string): SupportedNetwork {
  if (VALID_NETWORKS.includes(value as SupportedNetwork)) {
    return value as SupportedNetwork;
  }
  const msg =
    `[Forsety] Invalid NEXT_PUBLIC_APTOS_NETWORK="${value}". ` +
    `Valid: ${VALID_NETWORKS.join(", ")}.`;
  if (process.env.NODE_ENV === "development") {
    throw new Error(msg);
  }
  console.error(msg + ` Falling back to "testnet".`);
  return "testnet";
}

export const APTOS_NETWORK: SupportedNetwork = validateNetwork(
  (process.env.NEXT_PUBLIC_APTOS_NETWORK as string) || "testnet"
);

export function getAptosNetwork(networkName?: string): Network {
  const name = networkName ?? APTOS_NETWORK;
  switch (name) {
    case "mainnet":
      return Network.MAINNET;
    case "testnet":
    default:
      return Network.TESTNET;
  }
}

/** Shared wallet adapter props - single source of truth for providers.tsx & wallet-launch-flow.tsx */
export function getWalletAdapterProps(networkName?: string) {
  const name = (networkName ?? APTOS_NETWORK) as SupportedNetwork;
  const network = getAptosNetwork(name);

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
