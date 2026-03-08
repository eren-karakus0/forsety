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
