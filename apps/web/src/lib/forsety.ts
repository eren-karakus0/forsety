import { ForsetyClient } from "@forsety/sdk";
import { getEnv } from "./env";

let client: ForsetyClient | null = null;

export function getForsetyClient(): ForsetyClient {
  if (!client) {
    const env = getEnv();
    client = new ForsetyClient({
      databaseUrl: env.DATABASE_URL,
      shelbyNetwork: "shelbynet",
      shelbyWalletAddress: env.SHELBY_WALLET_ADDRESS,
    });
  }
  return client;
}
