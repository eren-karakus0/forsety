import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createForsetyMcpServer } from "./server.js";
import { startHttpServer } from "./http-server.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const hmacSecret = process.env.FORSETY_HMAC_SECRET;
if (!hmacSecret) {
  console.error("FORSETY_HMAC_SECRET environment variable is required");
  process.exit(1);
}

const config = {
  databaseUrl,
  shelbyMode: (process.env.SHELBY_MOCK === "true" ? "mock" : "live") as
    | "mock"
    | "live",
  shelbyWalletAddress: process.env.SHELBY_WALLET_ADDRESS,
  hmacSecret,
};

// Parse --transport flag (default: stdio)
const transportArg = process.argv.find((a) => a.startsWith("--transport"));
const transport =
  transportArg?.split("=")[1] ??
  (process.argv.includes("--transport")
    ? process.argv[process.argv.indexOf("--transport") + 1]
    : "stdio");

if (transport === "http") {
  const port = parseInt(process.env.MCP_PORT ?? "3001", 10);
  const host = process.env.MCP_HOST ?? "127.0.0.1";
  const corsOrigin = process.env.MCP_CORS_ORIGIN ?? "*";

  startHttpServer(config, { port, host, corsOrigin });
} else {
  const { server } = createForsetyMcpServer(config);
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);

  console.error("Forsety MCP server started (stdio)");
}
