import { ForsetyClient } from "@forsety/sdk";
import { getEnv } from "./env";

let client: ForsetyClient | null = null;

export function getForsetyClient(): ForsetyClient {
  if (!client) {
    const env = getEnv();
    client = new ForsetyClient({
      databaseUrl: env.DATABASE_URL,
      shelbyNetwork: "testnet",
      shelbyWalletAddress: env.SHELBY_WALLET_ADDRESS,
      shelbyMode: process.env.SHELBY_MOCK === "true" ? "mock" : "live",
      hmacSecret: env.FORSETY_HMAC_SECRET,
    });
  }
  return client;
}
