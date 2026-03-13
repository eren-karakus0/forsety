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
    it("should throw when action is missing", async () => {
      await expect(
        service.log({ agentId: "a1", action: "" })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should allow null agentId for auth failures", async () => {
      const mockLog = { id: "log-2", action: "tool.forsety_memory_store", status: "denied" };
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockLog]),
        }),
      });

      const result = await service.log({
        agentId: null,
        action: "tool.forsety_memory_store",
        status: "denied",
        errorMessage: "Invalid or missing API key",
      });

      expect(result).toEqual(mockLog);
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
      const recentLogs = [
        { action: "memory.store", status: "success", timestamp: new Date() },
        { action: "memory.store", status: "success", timestamp: new Date() },
        { action: "dataset.access", status: "denied", timestamp: new Date() },
        { action: "memory.store", status: "error", timestamp: new Date() },
      ];

      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: SQL aggregation for counts
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { total: 4, success: 2, denied: 1, error: 1 },
              ]),
            }),
          };
        }
        // Second call: recent actions with limit
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(recentLogs),
              }),
            }),
          }),
        };
      });

      const summary = await service.getSummary("a1");
      expect(summary.totalActions).toBe(4);
      expect(summary.successCount).toBe(2);
      expect(summary.deniedCount).toBe(1);
      expect(summary.errorCount).toBe(1);
      expect(summary.recentActions).toHaveLength(4);
    });

    it("should return empty summary for no logs", async () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { total: 0, success: 0, denied: 0, error: 0 },
              ]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        };
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

  describe("countAll", () => {
    it("should return total count of all audit events", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockResolvedValue([{ total: 42 }]),
      });

      const result = await service.countAll();
      expect(result).toBe(42);
    });

    it("should return 0 when no events exist", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockResolvedValue([{ total: 0 }]),
      });

      const result = await service.countAll();
      expect(result).toBe(0);
    });
  });

  describe("listAll", () => {
    it("should return all logs without filters", async () => {
      const logs = [
        { id: "log-1", agentId: "a1", action: "tool.forsety_memory_store" },
        { id: "log-2", agentId: null, action: "tool.forsety_memory_store" },
      ];
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

      const result = await service.listAll();
      expect(result).toEqual(logs);
      expect(result).toHaveLength(2);
    });

    it("should filter by specific agentId", async () => {
      const logs = [{ id: "log-1", agentId: "a1" }];
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

      const result = await service.listAll({ agentId: "a1" });
      expect(result).toEqual(logs);
    });

    it("should filter anonymous (null agentId) logs", async () => {
      const logs = [{ id: "log-2", agentId: null, status: "denied" }];
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

      const result = await service.listAll({ agentId: null });
      expect(result).toEqual(logs);
      expect(result[0]?.agentId).toBeNull();
    });

    it("should filter by status", async () => {
      const logs = [{ id: "log-3", status: "denied" }];
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

      const result = await service.listAll({ status: "denied" });
      expect(result).toEqual(logs);
    });
  });
});
