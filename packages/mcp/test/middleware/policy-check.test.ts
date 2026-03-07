import { describe, it, expect } from "vitest";
import { PolicyCheckMiddleware } from "../../src/middleware/policy-check.js";

describe("PolicyCheckMiddleware", () => {
  const middleware = new PolicyCheckMiddleware();

  describe("checkPermission", () => {
    it("should allow when agent has required permission", () => {
      const agent = { permissions: ["memory.write", "memory.read"] } as any;
      const result = middleware.checkPermission(agent, "forsety_memory_store");
      expect(result.allowed).toBe(true);
    });

    it("should deny when agent lacks permission", () => {
      const agent = { permissions: ["memory.read"] } as any;
      const result = middleware.checkPermission(agent, "forsety_memory_store");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("memory.write");
    });

    it("should deny for unknown tool", () => {
      const agent = { permissions: ["memory.read"] } as any;
      const result = middleware.checkPermission(agent, "unknown_tool");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Unknown tool");
    });
  });

  describe("checkDatasetAccess", () => {
    it("should allow wildcard access", () => {
      const agent = { allowedDatasets: ["*"] } as any;
      const result = middleware.checkDatasetAccess(agent, "dataset-uuid");
      expect(result.allowed).toBe(true);
    });

    it("should allow specific dataset access", () => {
      const agent = { allowedDatasets: ["dataset-uuid"] } as any;
      const result = middleware.checkDatasetAccess(agent, "dataset-uuid");
      expect(result.allowed).toBe(true);
    });

    it("should deny when dataset not in allowed list", () => {
      const agent = { allowedDatasets: ["other-uuid"] } as any;
      const result = middleware.checkDatasetAccess(agent, "dataset-uuid");
      expect(result.allowed).toBe(false);
    });
  });
});
