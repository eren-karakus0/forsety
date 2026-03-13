import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock DB ---
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

const mockDb = {
  insert: () => {
    mockInsert();
    return { values: mockValues };
  },
  select: () => {
    mockSelect();
    return { from: mockFrom };
  },
  update: () => {
    mockUpdate();
    return { set: mockSet };
  },
  delete: () => {
    mockDelete();
    return { where: mockWhere };
  },
};

// Chain setups
mockValues.mockReturnValue({ returning: mockReturning });
mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning, orderBy: mockOrderBy });
mockOrderBy.mockReturnValue([]);
mockLimit.mockReturnValue([]);
mockSet.mockReturnValue({ where: mockWhere });

const mockShelby = {
  uploadDataset: vi.fn(),
  downloadDataset: vi.fn(),
};

import { DatasetService } from "../../src/services/dataset.service.js";

describe("DatasetService - Archive", () => {
  let service: DatasetService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DatasetService(mockDb as never, mockShelby as never);
    // Reset chains
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning, orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue([]);
    mockLimit.mockReturnValue([]);
    mockSet.mockReturnValue({ where: mockWhere });
    mockValues.mockReturnValue({ returning: mockReturning });
  });

  it("archive() should set archivedAt", async () => {
    const archived = {
      id: "ds-1",
      name: "test",
      archivedAt: new Date(),
      ownerAddress: "0x1",
    };
    mockReturning.mockResolvedValue([archived]);

    const result = await service.archive("ds-1");

    expect(result).toEqual(archived);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ archivedAt: expect.any(Date) })
    );
  });

  it("archive() should return null for non-existent dataset", async () => {
    mockReturning.mockResolvedValue([]);

    const result = await service.archive("nonexistent");

    expect(result).toBeNull();
  });

  it("restore() should clear archivedAt", async () => {
    const restored = {
      id: "ds-1",
      name: "test",
      archivedAt: null,
      ownerAddress: "0x1",
    };
    mockReturning.mockResolvedValue([restored]);

    const result = await service.restore("ds-1");

    expect(result).toEqual(restored);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ archivedAt: null })
    );
  });

  it("delete() should throw on non-archived dataset", async () => {
    // getById returns non-archived dataset
    mockLimit.mockResolvedValue([{
      id: "ds-1",
      name: "active",
      archivedAt: null,
      ownerAddress: "0x1",
    }]);

    await expect(service.delete("ds-1")).rejects.toThrow(
      "Dataset must be archived before deletion"
    );
  });

  it("delete() should succeed on archived dataset", async () => {
    // getById returns archived dataset
    mockLimit.mockResolvedValueOnce([{
      id: "ds-1",
      name: "archived",
      archivedAt: new Date(),
      ownerAddress: "0x1",
    }]);

    // delete returns the deleted dataset
    const deleted = { id: "ds-1", name: "archived" };
    mockReturning.mockResolvedValue([deleted]);

    const result = await service.delete("ds-1");

    expect(result).toEqual(deleted);
    expect(mockDelete).toHaveBeenCalled();
  });

  it("delete() should return null for non-existent dataset", async () => {
    mockLimit.mockResolvedValue([]);

    const result = await service.delete("nonexistent");

    expect(result).toBeNull();
  });

  it("list() should exclude archived datasets", async () => {
    // list() calls db.select().from(datasets).where(isNull(archivedAt)).orderBy(...)
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    const activeDatasets = [
      { id: "ds-1", name: "active", archivedAt: null },
    ];
    mockOrderBy.mockResolvedValue(activeDatasets);

    const result = await service.list();

    expect(result).toEqual(activeDatasets);
    expect(mockSelect).toHaveBeenCalled();
  });

  it("listAll() should include archived datasets", async () => {
    const allDatasets = [
      { id: "ds-1", name: "active", archivedAt: null },
      { id: "ds-2", name: "archived", archivedAt: new Date() },
    ];
    mockOrderBy.mockResolvedValue(allDatasets);

    const result = await service.listAll();

    expect(result).toEqual(allDatasets);
  });

  it("getById() should return archived datasets (no filter)", async () => {
    const archivedDs = {
      id: "ds-1",
      name: "archived",
      archivedAt: new Date(),
    };
    mockLimit.mockResolvedValue([archivedDs]);

    const result = await service.getById("ds-1");

    expect(result).toEqual(archivedDs);
  });
});
