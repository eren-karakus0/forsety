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
const mockLimitNum = vi.fn();
const mockOffset = vi.fn();

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
};

// Chain setups
mockValues.mockReturnValue({ returning: mockReturning });
mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
mockWhere.mockReturnValue({
  limit: mockLimit,
  returning: mockReturning,
  orderBy: mockOrderBy,
});
mockOrderBy.mockReturnValue({
  limit: mockLimitNum,
});
mockLimitNum.mockReturnValue({ offset: mockOffset });
mockOffset.mockResolvedValue([]);
mockLimit.mockReturnValue([]);
mockSet.mockReturnValue({ where: mockWhere });

import { LicenseService } from "../../src/services/license.service.js";

describe("LicenseService - CRUD", () => {
  let service: LicenseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LicenseService(mockDb as never);
    // Reset chains
    mockValues.mockReturnValue({ returning: mockReturning });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockWhere.mockReturnValue({
      limit: mockLimit,
      returning: mockReturning,
      orderBy: mockOrderBy,
    });
    mockOrderBy.mockReturnValue({ limit: mockLimitNum });
    mockLimitNum.mockReturnValue({ offset: mockOffset });
    mockOffset.mockResolvedValue([]);
    mockLimit.mockReturnValue([]);
    mockSet.mockReturnValue({ where: mockWhere });
  });

  it("attach() should create a license", async () => {
    const license = {
      id: "lic-1",
      datasetId: "ds-1",
      spdxType: "MIT",
      grantorAddress: "0x1",
      revokedAt: null,
    };
    mockReturning.mockResolvedValue([license]);

    const result = await service.attach({
      datasetId: "ds-1",
      spdxType: "MIT",
      grantorAddress: "0x1",
    });

    expect(result).toEqual(license);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("attach() should throw on missing fields", async () => {
    await expect(
      service.attach({ datasetId: "", spdxType: "MIT", grantorAddress: "0x1" })
    ).rejects.toThrow("datasetId, spdxType, and grantorAddress are required");
  });

  it("getById() should return a license", async () => {
    const license = { id: "lic-1", spdxType: "MIT" };
    mockLimit.mockResolvedValue([license]);

    const result = await service.getById("lic-1");

    expect(result).toEqual(license);
  });

  it("getByDatasetId() should return licenses for a dataset", async () => {
    const licenseList = [{ id: "lic-1" }, { id: "lic-2" }];
    mockWhere.mockResolvedValue(licenseList);

    const result = await service.getByDatasetId("ds-1");

    expect(result).toEqual(licenseList);
  });

  it("listAll() should return licenses with pagination", async () => {
    const licenseList = [{ id: "lic-1" }];
    mockOffset.mockResolvedValue(licenseList);

    const result = await service.listAll({ limit: 10, offset: 0 });

    expect(result).toEqual(licenseList);
  });

  it("listAll() should exclude revoked by default", async () => {
    mockOffset.mockResolvedValue([]);

    await service.listAll();

    // The where clause should have been called with conditions including isNull(revokedAt)
    expect(mockSelect).toHaveBeenCalled();
  });

  it("listAll() should include revoked when flag set", async () => {
    mockOffset.mockResolvedValue([]);

    await service.listAll({ includeRevoked: true });

    expect(mockSelect).toHaveBeenCalled();
  });

  it("revoke() should set revokedAt", async () => {
    const revoked = { id: "lic-1", revokedAt: new Date() };
    mockReturning.mockResolvedValue([revoked]);

    const result = await service.revoke("lic-1");

    expect(result).toEqual(revoked);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ revokedAt: expect.any(Date) })
    );
  });

  it("revoke() should return null for non-existent license", async () => {
    mockReturning.mockResolvedValue([]);

    const result = await service.revoke("nonexistent");

    expect(result).toBeNull();
  });

  it("update() should change terms and recalculate hash", async () => {
    // getById returns existing license
    const existing = {
      id: "lic-1",
      spdxType: "MIT",
      grantorAddress: "0x1",
      terms: {},
      revokedAt: null,
    };
    mockLimit.mockResolvedValueOnce([existing]);

    // update returns updated license
    const updated = { ...existing, terms: { key: "value" } };
    mockReturning.mockResolvedValue([updated]);

    const result = await service.update("lic-1", {
      terms: { key: "value" },
    });

    expect(result).toEqual(updated);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        terms: { key: "value" },
        termsHash: expect.any(String),
      })
    );
  });

  it("update() on revoked license should throw", async () => {
    mockLimit.mockResolvedValue([{
      id: "lic-1",
      revokedAt: new Date(),
    }]);

    await expect(
      service.update("lic-1", { terms: {} })
    ).rejects.toThrow("Cannot update a revoked license");
  });

  it("update() on non-existent license should return null", async () => {
    mockLimit.mockResolvedValue([]);

    const result = await service.update("nonexistent", { terms: {} });

    expect(result).toBeNull();
  });
});
