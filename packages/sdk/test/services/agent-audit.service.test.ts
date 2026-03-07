import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentAuditService } from "../../src/services/agent-audit.service.js";
import { ForsetyValidationError } from "../../src/errors.js";

const mockInsert = vi.fn();
const mockSelect = vi.fn();

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
} as any;

describe("AgentAuditService", () => {
  let service: AgentAuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgentAuditService(mockDb);
  });

  describe("log", () => {
    it("should throw when agentId is missing", async () => {
      await expect(
        service.log({ agentId: "", action: "memory.store" })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should throw when action is missing", async () => {
      await expect(
        service.log({ agentId: "a1", action: "" })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should create audit log with default status", async () => {
      const mockLog = { id: "log-1", action: "memory.store", status: "success" };
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockLog]),
        }),
      });

      const result = await service.log({
        agentId: "a1",
        action: "memory.store",
        toolName: "forsety_memory_store",
      });

      expect(result).toEqual(mockLog);
    });
  });

  describe("getSummary", () => {
    it("should compute correct summary counts", async () => {
      const logs = [
        { action: "memory.store", status: "success", timestamp: new Date() },
        { action: "memory.store", status: "success", timestamp: new Date() },
        { action: "dataset.access", status: "denied", timestamp: new Date() },
        { action: "memory.store", status: "error", timestamp: new Date() },
      ];

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(logs),
          }),
        }),
      });

      const summary = await service.getSummary("a1");
      expect(summary.totalActions).toBe(4);
      expect(summary.successCount).toBe(2);
      expect(summary.deniedCount).toBe(1);
      expect(summary.errorCount).toBe(1);
      expect(summary.recentActions).toHaveLength(4);
    });

    it("should return empty summary for no logs", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const summary = await service.getSummary("a1");
      expect(summary.totalActions).toBe(0);
      expect(summary.recentActions).toHaveLength(0);
    });
  });

  describe("getByAgent", () => {
    it("should return filtered logs", async () => {
      const logs = [{ id: "log-1", action: "memory.store" }];
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(logs),
              }),
            }),
          }),
        }),
      });

      const result = await service.getByAgent("a1", { action: "memory.store" });
      expect(result).toEqual(logs);
    });
  });
});
