// Phase 2: stdio transport only
// Phase 3: SSE transport will be added alongside stdio
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createForsetyMcpServer } from "./server.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const { server } = createForsetyMcpServer({
  databaseUrl,
  shelbyMode: (process.env.SHELBY_MOCK === "true" ? "mock" : "live") as "mock" | "live",
  shelbyWalletAddress: process.env.SHELBY_WALLET_ADDRESS,
});

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("Forsety MCP server started (stdio)");
