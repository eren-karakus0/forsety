import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock DB ---
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

const mockDb = {
  select: (...args: unknown[]) => {
    mockSelect(...args);
    return { from: mockFrom };
  },
  insert: () => {
    mockInsert();
    return { values: mockValues };
  },
};

// Chain setups
mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
mockOrderBy.mockReturnValue({ limit: mockLimit });
mockLimit.mockReturnValue({ offset: mockOffset });
mockOffset.mockResolvedValue([]);
mockValues.mockReturnValue({ returning: mockReturning });

const mockPolicyService = {
  checkAccess: vi.fn(),
  checkAndIncrementReads: vi.fn(),
  incrementReads: vi.fn(),
};

import { AccessService } from "../../src/services/access.service.js";

describe("AccessService - Query", () => {
  let service: AccessService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AccessService(mockDb as never, mockPolicyService as never);
    // Reset chains
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ offset: mockOffset });
    mockOffset.mockResolvedValue([]);
  });

  it("listAll() with no filters should return all logs", async () => {
    const logs = [
      { id: "log-1", datasetId: "ds-1" },
      { id: "log-2", datasetId: "ds-2" },
    ];
    mockOffset.mockResolvedValue(logs);

    const result = await service.listAll();

    expect(result).toEqual(logs);
    expect(mockSelect).toHaveBeenCalled();
  });

  it("listAll() with datasetId filter", async () => {
    mockOffset.mockResolvedValue([{ id: "log-1", datasetId: "ds-1" }]);

    const result = await service.listAll({ datasetId: "ds-1" });

    expect(result).toHaveLength(1);
  });

  it("listAll() with operationType filter", async () => {
    mockOffset.mockResolvedValue([{ id: "log-1", operationType: "download" }]);

    const result = await service.listAll({ operationType: "download" });

    expect(result).toHaveLength(1);
  });

  it("listAll() with date range", async () => {
    mockOffset.mockResolvedValue([]);

    const result = await service.listAll({
      from: new Date("2025-01-01"),
      to: new Date("2025-12-31"),
    });

    expect(result).toEqual([]);
    expect(mockSelect).toHaveBeenCalled();
  });

  it("listAll() with pagination (limit + offset)", async () => {
    mockOffset.mockResolvedValue([{ id: "log-3" }]);

    const result = await service.listAll({ limit: 1, offset: 2 });

    expect(result).toHaveLength(1);
    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(mockOffset).toHaveBeenCalledWith(2);
  });

  it("count() should return correct total", async () => {
    // count uses db.select({ count: sqlCount() })
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ count: 42 }]);

    const result = await service.count();

    expect(result).toBe(42);
  });
});
