import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "node:http";

const { mockHandleRequest, mockConnect, mockTransportClose } = vi.hoisted(
  () => ({
    mockHandleRequest: vi.fn(),
    mockConnect: vi.fn(),
    mockTransportClose: vi.fn(),
  })
);

vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({
    sessionId: "test-session-id",
    handleRequest: mockHandleRequest,
    close: mockTransportClose,
    onclose: null,
  })),
}));

vi.mock("../src/server.js", () => ({
  createForsetyMcpServer: vi.fn().mockReturnValue({
    server: {
      connect: mockConnect,
    },
    client: {},
  }),
}));

vi.mock("@forsety/sdk", () => ({
  ForsetyClient: vi.fn().mockImplementation(() => ({})),
}));

import { startHttpServer } from "../src/http-server.js";

function makeRequest(
  server: http.Server,
  options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === "string")
      return reject(new Error("No address"));

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: addr.port,
        path: options.path,
        method: options.method,
        headers: options.headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode!,
            headers: res.headers,
            body: data,
          })
        );
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

describe("HTTP Server", () => {
  let server: http.Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleRequest.mockImplementation(
      (_req: http.IncomingMessage, res: http.ServerResponse) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", result: {} }));
      }
    );
  });

  afterEach(
    () =>
      new Promise<void>((resolve) => {
        if (server?.listening) {
          server.close(() => resolve());
        } else {
          resolve();
        }
      })
  );

  it("should start and respond to health check", async () => {
    server = startHttpServer(
      { databaseUrl: "postgres://test" },
      { port: 0, host: "127.0.0.1" }
    );
    await new Promise<void>((resolve) => server.once("listening", resolve));

    const res = await makeRequest(server, {
      method: "GET",
      path: "/health",
    });

    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ok");
    expect(body.transport).toBe("streamable-http");
    expect(body.sessions).toBe(0);
  });

  it("should return 404 for unknown paths", async () => {
    server = startHttpServer(
      { databaseUrl: "postgres://test" },
      { port: 0, host: "127.0.0.1" }
    );
    await new Promise<void>((resolve) => server.once("listening", resolve));

    const res = await makeRequest(server, {
      method: "GET",
      path: "/unknown",
    });

    expect(res.status).toBe(404);
  });

  it("should handle CORS preflight", async () => {
    server = startHttpServer(
      { databaseUrl: "postgres://test" },
      { port: 0, host: "127.0.0.1" }
    );
    await new Promise<void>((resolve) => server.once("listening", resolve));

    const res = await makeRequest(server, {
      method: "OPTIONS",
      path: "/mcp",
    });

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
    expect(res.headers["access-control-expose-headers"]).toContain(
      "mcp-session-id"
    );
  });

  it("should create new session on POST /mcp without session ID", async () => {
    server = startHttpServer(
      { databaseUrl: "postgres://test" },
      { port: 0, host: "127.0.0.1" }
    );
    await new Promise<void>((resolve) => server.once("listening", resolve));

    const res = await makeRequest(server, {
      method: "POST",
      path: "/mcp",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    });

    expect(res.status).toBe(200);
    expect(mockConnect).toHaveBeenCalled();
    expect(mockHandleRequest).toHaveBeenCalled();
  });

  it("should route to existing session by mcp-session-id", async () => {
    server = startHttpServer(
      { databaseUrl: "postgres://test" },
      { port: 0, host: "127.0.0.1" }
    );
    await new Promise<void>((resolve) => server.once("listening", resolve));

    // First request creates session
    await makeRequest(server, {
      method: "POST",
      path: "/mcp",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    });

    // Second request with session ID
    const res = await makeRequest(server, {
      method: "POST",
      path: "/mcp",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": "test-session-id",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        id: 2,
      }),
    });

    expect(res.status).toBe(200);
    expect(mockHandleRequest).toHaveBeenCalledTimes(2);
  });

  it("should return 404 for unknown session ID", async () => {
    server = startHttpServer(
      { databaseUrl: "postgres://test" },
      { port: 0, host: "127.0.0.1" }
    );
    await new Promise<void>((resolve) => server.once("listening", resolve));

    const res = await makeRequest(server, {
      method: "POST",
      path: "/mcp",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": "nonexistent",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
    });

    expect(res.status).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Session not found");
  });

  it("should return 400 for GET /mcp without session ID", async () => {
    server = startHttpServer(
      { databaseUrl: "postgres://test" },
      { port: 0, host: "127.0.0.1" }
    );
    await new Promise<void>((resolve) => server.once("listening", resolve));

    const res = await makeRequest(server, {
      method: "GET",
      path: "/mcp",
    });

    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Missing mcp-session-id header");
  });
});
