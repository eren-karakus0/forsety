import http from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ForsetyClient } from "@forsety/sdk";
import { createForsetyMcpServer } from "./server.js";
import type { ForsetyMcpServerConfig } from "./server.js";

interface HttpServerOptions {
  port?: number;
  host?: string;
  corsOrigin?: string;
}

const MAX_SESSIONS = 100;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  createdAt: number;
}

/**
 * Start the Forsety MCP server with Streamable HTTP transport.
 *
 * Each MCP session gets its own StreamableHTTPServerTransport + McpServer,
 * but they share a single ForsetyClient (= single DB connection pool).
 */
export function startHttpServer(
  config: ForsetyMcpServerConfig,
  options: HttpServerOptions = {}
) {
  const { port = 3001, host = "127.0.0.1", corsOrigin = "http://localhost:3000" } = options;

  const sharedClient = new ForsetyClient({
    databaseUrl: config.databaseUrl,
    shelbyMode: config.shelbyMode ?? "mock",
    shelbyWalletAddress: config.shelbyWalletAddress,
    hmacSecret: config.hmacSecret,
  });

  const sessions = new Map<string, SessionEntry>();

  // Periodic cleanup of expired sessions
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of sessions) {
      if (now - entry.createdAt > SESSION_TTL_MS) {
        sessions.delete(id);
      }
    }
  }, 5 * 60 * 1000); // every 5 minutes

  // Prevent interval from keeping process alive
  cleanupInterval.unref();

  const httpServer = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, mcp-session-id, Authorization"
    );
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health endpoint
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          transport: "streamable-http",
        })
      );
      return;
    }

    // MCP endpoint
    if (req.url === "/mcp") {
      try {
        await handleMcpRequest(req, res, config, sharedClient, sessions);
      } catch (error) {
        console.error("MCP request error:", error);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  httpServer.listen(port, host, () => {
    console.error(
      `Forsety MCP server started (http) at http://${host}:${port}/mcp`
    );
  });

  return httpServer;
}

async function handleMcpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: ForsetyMcpServerConfig,
  sharedClient: ForsetyClient,
  sessions: Map<string, SessionEntry>
) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // Existing session — delegate to its transport
  if (sessionId && sessions.has(sessionId)) {
    const entry = sessions.get(sessionId)!;
    await entry.transport.handleRequest(req, res);
    return;
  }

  // Session not found
  if (sessionId && !sessions.has(sessionId)) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Session not found" }));
    return;
  }

  // New session — only via POST (initialization)
  if (!sessionId && req.method === "POST") {
    // Enforce session cap
    if (sessions.size >= MAX_SESSIONS) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Too many active sessions" }));
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    const { server } = createForsetyMcpServer(config, sharedClient);
    await server.connect(transport);

    if (transport.sessionId) {
      sessions.set(transport.sessionId, { transport, createdAt: Date.now() });
    }

    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
      }
    };

    await transport.handleRequest(req, res);
    return;
  }

  // GET/DELETE without session ID
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Missing mcp-session-id header" }));
}
