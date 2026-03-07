import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditMiddleware } from "../../src/middleware/audit.js";

describe("AuditMiddleware", () => {
  const mockAuditService = {
    log: vi.fn().mockResolvedValue({ id: "log-1" }),
  } as any;

  let audit: AuditMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    audit = new AuditMiddleware(mockAuditService);
  });

  it("should log tool call with correct params", async () => {
    await audit.logToolCall({
      agentId: "a1",
      toolName: "forsety_memory_store",
      input: { key: "test" },
      output: { memoryId: "m1" },
      status: "success",
      durationMs: 42,
      resourceType: "memory",
    });

    expect(mockAuditService.log).toHaveBeenCalledWith({
      agentId: "a1",
      action: "tool.forsety_memory_store",
      toolName: "forsety_memory_store",
      resourceType: "memory",
      resourceId: undefined,
      input: { key: "test" },
      output: { memoryId: "m1" },
      status: "success",
      errorMessage: undefined,
      durationMs: 42,
    });
  });

  it("should log denied tool call", async () => {
    await audit.logToolCall({
      agentId: "a1",
      toolName: "forsety_memory_store",
      input: {},
      output: { error: "denied" },
      status: "denied",
      errorMessage: "No permission",
      durationMs: 1,
    });

    const call = mockAuditService.log.mock.calls[0][0];
    expect(call.status).toBe("denied");
    expect(call.errorMessage).toBe("No permission");
  });
});
