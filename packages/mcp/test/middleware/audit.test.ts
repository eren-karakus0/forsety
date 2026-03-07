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

  it("should redact sensitive content from input", async () => {
    await audit.logToolCall({
      agentId: "a1",
      toolName: "forsety_memory_store",
      input: {
        key: "user-prefs",
        namespace: "default",
        content: { secret: "very-sensitive-data", password: "hunter2" },
      },
      output: { memoryId: "m1" },
      status: "success",
      durationMs: 10,
    });

    const call = mockAuditService.log.mock.calls[0][0];
    expect(call.input.key).toBe("user-prefs");
    expect(call.input.namespace).toBe("default");
    expect(call.input.content).toBe("[REDACTED]");
  });

  it("should redact sensitive content from output", async () => {
    await audit.logToolCall({
      agentId: "a1",
      toolName: "forsety_memory_retrieve",
      input: { key: "test", namespace: "default" },
      output: {
        id: "m1",
        content: { data: "secret-memory-content" },
        contentHash: "sha256:abc123",
        memories: [{ key: "k1" }],
      },
      status: "success",
      durationMs: 5,
    });

    const call = mockAuditService.log.mock.calls[0][0];
    expect(call.output.id).toBe("m1");
    expect(call.output.content).toBe("[REDACTED]");
    expect(call.output.contentHash).toBe("[REDACTED]");
    expect(call.output.memories).toBe("[REDACTED]");
  });

  it("should handle nested sensitive fields in input", async () => {
    await audit.logToolCall({
      agentId: "a1",
      toolName: "forsety_memory_store",
      input: {
        key: "test",
        metadata: { apiKey: "fsy_secret123", label: "safe" },
      },
      output: {},
      status: "success",
      durationMs: 3,
    });

    const call = mockAuditService.log.mock.calls[0][0];
    expect(call.input.key).toBe("test");
    expect(call.input.metadata.apiKey).toBe("[REDACTED]");
    expect(call.input.metadata.label).toBe("safe");
  });

  it("should allow null agentId for auth failures", async () => {
    await audit.logToolCall({
      agentId: null,
      toolName: "forsety_memory_store",
      input: { key: "test" },
      output: { error: "Authentication failed" },
      status: "denied",
      errorMessage: "Invalid or missing API key",
      durationMs: 2,
    });

    const call = mockAuditService.log.mock.calls[0][0];
    expect(call.agentId).toBeNull();
    expect(call.status).toBe("denied");
  });
});
