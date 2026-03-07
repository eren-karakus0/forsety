import { describe, it, expect, vi, beforeEach } from "vitest";
import { datasetAccess } from "../../src/tools/dataset-access.js";
import { policyCheck } from "../../src/tools/policy-check.js";
import type { McpContext } from "../../src/types.js";

const mockClient = {
  datasets: {
    getById: vi.fn(),
  },
  access: {
    logAccess: vi.fn(),
  },
  policies: {
    checkAccess: vi.fn(),
  },
} as any;

const ctx: McpContext = {
  agent: {
    id: "agent-1",
    name: "test-agent",
    ownerAddress: "0xowner",
  } as any,
  startTime: Date.now(),
};

describe("Dataset & Policy Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("datasetAccess", () => {
    it("should return error for non-existent dataset", async () => {
      mockClient.datasets.getById.mockResolvedValue(null);

      const result = await datasetAccess(
        { datasetId: "00000000-0000-0000-0000-000000000001", operationType: "read" },
        ctx,
        mockClient
      );

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe("Dataset not found");
    });

    it("should log access and return result", async () => {
      mockClient.datasets.getById.mockResolvedValue({
        id: "ds-1",
        name: "test-dataset",
        blobHash: "abc",
      });
      mockClient.access.logAccess.mockResolvedValue({
        id: "log-1",
        operationType: "read",
        readProof: "proof-hash",
        timestamp: new Date(),
      });

      const result = await datasetAccess(
        { datasetId: "00000000-0000-0000-0000-000000000001", operationType: "read" },
        ctx,
        mockClient
      );

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.accessLog.id).toBe("log-1");
      expect(parsed.dataset.name).toBe("test-dataset");
    });
  });

  describe("policyCheck", () => {
    it("should return allowed=true when policy permits", async () => {
      mockClient.policies.checkAccess.mockResolvedValue({
        allowed: true,
        policy: {
          id: "p1",
          version: 1,
          allowedAccessors: ["*"],
          maxReads: null,
          readsConsumed: 0,
          expiresAt: null,
        },
      });

      const result = await policyCheck(
        { datasetId: "00000000-0000-0000-0000-000000000001" },
        ctx,
        mockClient
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.allowed).toBe(true);
      expect(parsed.policy).not.toBeNull();
    });

    it("should return allowed=false when no policy exists", async () => {
      mockClient.policies.checkAccess.mockResolvedValue({
        allowed: false,
        policy: null,
      });

      const result = await policyCheck(
        { datasetId: "00000000-0000-0000-0000-000000000001" },
        ctx,
        mockClient
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.allowed).toBe(false);
      expect(parsed.reason).toContain("No policy");
    });
  });
});
