import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock dependencies ─────────────────────────────────────
const mockVerifyJwt = vi.fn();
const mockAuthenticate = vi.fn();

vi.mock("@forsety/auth", () => ({
  verifyJwt: (...args: any[]) => mockVerifyJwt(...args),
}));

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    agents: { authenticate: mockAuthenticate },
  }),
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    FORSETY_API_KEY: "test-api-key-123",
    JWT_SECRET: "test-secret",
  }),
}));

import {
  validateApiKey,
  resolveAccessor,
  resolveAccessorStrict,
  requireDatasetOwner,
  checkAgentScope,
} from "../../src/lib/auth";

function makeRequest(opts: { cookie?: string; apiKey?: string; accessor?: string } = {}) {
  const url = opts.accessor
    ? `http://localhost/test?accessor=${opts.accessor}`
    : "http://localhost/test";
  const headers: Record<string, string> = {};
  if (opts.apiKey) headers["x-api-key"] = opts.apiKey;
  if (opts.cookie) headers.cookie = `forsety-auth=${opts.cookie}`;
  return new NextRequest(url, { headers });
}

describe("auth.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveAccessor", () => {
    it("should return accessor from JWT cookie (trusted)", async () => {
      mockVerifyJwt.mockResolvedValue({ sub: "0xwallet-from-jwt" });

      const req = makeRequest({ cookie: "valid-jwt-token" });
      const result = await resolveAccessor(req);

      expect(result).toEqual({ accessor: "0xwallet-from-jwt", trusted: true });
    });

    it("should return accessor from agent API key with fsy_ prefix (trusted)", async () => {
      mockVerifyJwt.mockResolvedValue(null);
      mockAuthenticate.mockResolvedValue({
        id: "agent-1",
        ownerAddress: "0xagent-owner",
        permissions: ["read", "write"],
        allowedDatasets: ["ds-1"],
      });

      const req = makeRequest({ apiKey: "fsy_agent_key_123" });
      const result = await resolveAccessor(req);

      expect(result).toEqual({
        accessor: "0xagent-owner",
        trusted: true,
        agentId: "agent-1",
        agentPermissions: ["read", "write"],
        agentAllowedDatasets: ["ds-1"],
      });
    });

    it("should return accessor from global API key with accessor param (untrusted)", async () => {
      mockVerifyJwt.mockResolvedValue(null);

      const req = makeRequest({ apiKey: "test-api-key-123", accessor: "0xparam-address" });
      const result = await resolveAccessor(req);

      expect(result).toEqual({ accessor: "0xparam-address", trusted: false });
    });

    it("should return null when no auth provided", async () => {
      mockVerifyJwt.mockResolvedValue(null);

      const req = makeRequest();
      const result = await resolveAccessor(req);

      expect(result).toBeNull();
    });

    it("should return null when agent API key invalid", async () => {
      mockVerifyJwt.mockResolvedValue(null);
      mockAuthenticate.mockResolvedValue(null);

      const req = makeRequest({ apiKey: "fsy_invalid_key" });
      const result = await resolveAccessor(req);

      expect(result).toBeNull();
    });

    it("should return null when global API key wrong", async () => {
      mockVerifyJwt.mockResolvedValue(null);

      const req = makeRequest({ apiKey: "wrong-key", accessor: "0xaddr" });
      const result = await resolveAccessor(req);

      expect(result).toBeNull();
    });

    it("should return null when no accessor param with global key", async () => {
      mockVerifyJwt.mockResolvedValue(null);

      const req = makeRequest({ apiKey: "test-api-key-123" });
      const result = await resolveAccessor(req);

      expect(result).toBeNull();
    });

    it("should support Bearer token format for API key", async () => {
      mockVerifyJwt.mockResolvedValue(null);
      mockAuthenticate.mockResolvedValue({
        id: "agent-2",
        ownerAddress: "0xagent-2",
        permissions: ["read"],
        allowedDatasets: null,
      });

      const req = new NextRequest("http://localhost/test", {
        headers: { authorization: "Bearer fsy_bearer_token" },
      });
      const result = await resolveAccessor(req);

      expect(result?.accessor).toBe("0xagent-2");
      expect(result?.trusted).toBe(true);
    });
  });

  describe("resolveAccessorStrict", () => {
    it("should return trusted JWT auth", async () => {
      mockVerifyJwt.mockResolvedValue({ sub: "0xjwt-wallet" });

      const req = makeRequest({ cookie: "jwt-token" });
      const result = await resolveAccessorStrict(req);

      expect(result).toEqual({ accessor: "0xjwt-wallet", trusted: true });
    });

    it("should return null for untrusted global key auth", async () => {
      mockVerifyJwt.mockResolvedValue(null);

      const req = makeRequest({ apiKey: "test-api-key-123", accessor: "0xuntrusted" });
      const result = await resolveAccessorStrict(req);

      expect(result).toBeNull();
    });

    it("should return null when no auth", async () => {
      mockVerifyJwt.mockResolvedValue(null);

      const req = makeRequest();
      const result = await resolveAccessorStrict(req);

      expect(result).toBeNull();
    });

    it("should allow trusted agent API key", async () => {
      mockVerifyJwt.mockResolvedValue(null);
      mockAuthenticate.mockResolvedValue({
        id: "agent-3",
        ownerAddress: "0xagent-3",
        permissions: [],
        allowedDatasets: [],
      });

      const req = makeRequest({ apiKey: "fsy_strict_test" });
      const result = await resolveAccessorStrict(req);

      expect(result?.accessor).toBe("0xagent-3");
      expect(result?.trusted).toBe(true);
    });
  });

  describe("validateApiKey", () => {
    it("should return true for matching API key", () => {
      const req = makeRequest({ apiKey: "test-api-key-123" });
      const result = validateApiKey(req);

      expect(result).toBe(true);
    });

    it("should return false for wrong key", () => {
      const req = makeRequest({ apiKey: "wrong-key" });
      const result = validateApiKey(req);

      expect(result).toBe(false);
    });

    it("should return false for missing key", () => {
      const req = makeRequest();
      const result = validateApiKey(req);

      expect(result).toBe(false);
    });

    it("should return true for Bearer token format", () => {
      const req = new NextRequest("http://localhost/test", {
        headers: { authorization: "Bearer test-api-key-123" },
      });
      const result = validateApiKey(req);

      expect(result).toBe(true);
    });
  });

  describe("requireDatasetOwner", () => {
    const mockClient = {
      datasets: {
        getById: vi.fn(),
      },
    };

    beforeEach(() => {
      mockClient.datasets.getById.mockReset();
    });

    it("should return dataset when owner matches", async () => {
      mockClient.datasets.getById.mockResolvedValue({
        id: "ds-1",
        ownerAddress: "0xowner",
      });

      const result = await requireDatasetOwner(mockClient, "ds-1", "0xowner");

      expect(result.dataset).toBeDefined();
      expect(result.dataset?.ownerAddress).toBe("0xowner");
      expect(result.error).toBeUndefined();
    });

    it("should return 404 when dataset not found", async () => {
      mockClient.datasets.getById.mockResolvedValue(null);

      const result = await requireDatasetOwner(mockClient, "ds-999", "0xowner");

      expect(result.dataset).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(404);
      const json = await result.error!.json();
      expect(json.error).toContain("not found");
    });

    it("should return 403 when owner doesn't match", async () => {
      mockClient.datasets.getById.mockResolvedValue({
        id: "ds-2",
        ownerAddress: "0xowner",
      });

      const result = await requireDatasetOwner(mockClient, "ds-2", "0xother-user");

      expect(result.dataset).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(403);
      const json = await result.error!.json();
      expect(json.error).toBe("Forbidden");
    });
  });

  describe("checkAgentScope", () => {
    it("should allow non-agent auth (no agentId)", () => {
      const auth = {} as { agentId?: string; agentPermissions?: string[]; agentAllowedDatasets?: string[] };
      const result = checkAgentScope(auth, "read", "ds-1");

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should allow agent with matching permission", () => {
      const auth = {
        agentId: "agent-1",
        agentPermissions: ["read", "write"],
        agentAllowedDatasets: ["ds-1", "ds-2"],
      };
      const result = checkAgentScope(auth, "read", "ds-1");

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should deny agent missing permission", () => {
      const auth = {
        agentId: "agent-2",
        agentPermissions: ["read"],
        agentAllowedDatasets: [],
      };
      const result = checkAgentScope(auth, "write", "ds-1");

      expect(result.allowed).toBe(false);
      expect(result.error).toContain("lacks permission: write");
    });

    it("should deny agent not authorized for dataset", () => {
      const auth = {
        agentId: "agent-3",
        agentPermissions: ["read"],
        agentAllowedDatasets: ["ds-1"],
      };
      const result = checkAgentScope(auth, "read", "ds-2");

      expect(result.allowed).toBe(false);
      expect(result.error).toContain("not authorized for this dataset");
    });

    it("should allow agent with no dataset restrictions", () => {
      const auth = {
        agentId: "agent-4",
        agentPermissions: ["read"],
        agentAllowedDatasets: [],
      };
      const result = checkAgentScope(auth, "read", "ds-any");

      expect(result.allowed).toBe(true);
    });

    it("should allow when dataset check is optional", () => {
      const auth = {
        agentId: "agent-5",
        agentPermissions: ["read"],
        agentAllowedDatasets: ["ds-1"],
      };
      const result = checkAgentScope(auth, "read");

      expect(result.allowed).toBe(true);
    });

    // T3: allowedDatasets null vs empty vs scoped semantics
    it("should treat null allowedDatasets as unrestricted (access any dataset)", () => {
      const auth = {
        agentId: "agent-null-ds",
        agentPermissions: ["read"],
        agentAllowedDatasets: null as unknown as string[],
      };
      // null means no restriction — should allow access to any dataset
      const result = checkAgentScope(auth, "read", "ds-any");
      expect(result.allowed).toBe(true);
    });

    it("should treat empty allowedDatasets [] as unrestricted (access any dataset)", () => {
      const auth = {
        agentId: "agent-empty-ds",
        agentPermissions: ["read"],
        agentAllowedDatasets: [],
      };
      // Empty array means no restriction — should allow access to any dataset
      const result = checkAgentScope(auth, "read", "ds-any");
      expect(result.allowed).toBe(true);
    });

    it("should restrict access when allowedDatasets is a non-empty array", () => {
      const auth = {
        agentId: "agent-scoped",
        agentPermissions: ["read"],
        agentAllowedDatasets: ["ds-1"],
      };
      // Scoped: should deny access to ds-2
      const denied = checkAgentScope(auth, "read", "ds-2");
      expect(denied.allowed).toBe(false);
      expect(denied.error).toContain("not authorized");

      // Scoped: should allow access to ds-1
      const allowed = checkAgentScope(auth, "read", "ds-1");
      expect(allowed.allowed).toBe(true);
    });
  });
});
