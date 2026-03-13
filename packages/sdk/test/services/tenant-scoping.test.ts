import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatasetService } from "../../src/services/dataset.service.js";
import { LicenseService } from "../../src/services/license.service.js";
import { AccessService } from "../../src/services/access.service.js";
import { PolicyService } from "../../src/services/policy.service.js";
import { EvidenceService } from "../../src/services/evidence.service.js";
import { AgentAuditService } from "../../src/services/agent-audit.service.js";

// ─── DB mock helpers ─────────────────────────────────────────
function chainMock(result: unknown) {
  const chain: Record<string, any> = {};
  const terminal = vi.fn().mockResolvedValue(result);

  // Build a fluent chain where any method returns the chain, and the last returns `result`
  const methods = ["from", "where", "orderBy", "limit", "offset", "innerJoin", "select"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Terminal nodes
  chain.orderBy = vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: terminal }) });
  return { start: chain, terminal };
}

function makeSelectDb(result: unknown) {
  const { start } = chainMock(result);
  return { select: vi.fn().mockReturnValue(start) } as any;
}

// ─── DatasetService ──────────────────────────────────────────
describe("DatasetService.listByOwner", () => {
  it("should call select with ownerAddress filter", async () => {
    const mockDatasets = [
      { id: "d1", name: "Mine", ownerAddress: "0xowner" },
    ];
    const orderBy = vi.fn().mockResolvedValue(mockDatasets);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const shelby = { uploadDataset: vi.fn() } as any;
    const service = new DatasetService(db, shelby);

    const result = await service.listByOwner("0xowner");
    expect(result).toEqual(mockDatasets);
    expect(select).toHaveBeenCalled();
  });

  it("should return empty array when no datasets for owner", async () => {
    const orderBy = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const shelby = { uploadDataset: vi.fn() } as any;
    const service = new DatasetService(db, shelby);

    const result = await service.listByOwner("0xnobody");
    expect(result).toEqual([]);
  });
});

describe("DatasetService.listWithLicensesByOwner", () => {
  it("should return datasets with license info for owner", async () => {
    const mockDatasets = [{ id: "d1", name: "Mine", ownerAddress: "0xowner" }];
    const mockLicenses = [{ datasetId: "d1", spdxType: "MIT" }];

    const orderBy1 = vi.fn().mockResolvedValue(mockDatasets);
    const where1 = vi.fn().mockReturnValue({ orderBy: orderBy1 });
    const from1 = vi.fn().mockReturnValue({ where: where1 });

    const orderBy2 = vi.fn().mockResolvedValue(mockLicenses);
    const where2 = vi.fn().mockReturnValue({ orderBy: orderBy2 });
    const from2 = vi.fn().mockReturnValue({ where: where2 });

    let callCount = 0;
    const select = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? { from: from1 } : { from: from2 };
    });
    const db = { select } as any;
    const shelby = { uploadDataset: vi.fn() } as any;
    const service = new DatasetService(db, shelby);

    const result = await service.listWithLicensesByOwner("0xowner");
    expect(result).toHaveLength(1);
    expect(result[0]!.licenseSpdx).toBe("MIT");
  });

  it("should return empty when owner has no datasets", async () => {
    const orderBy = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const shelby = { uploadDataset: vi.fn() } as any;
    const service = new DatasetService(db, shelby);

    const result = await service.listWithLicensesByOwner("0xnobody");
    expect(result).toEqual([]);
  });
});

// ─── LicenseService ─────────────────────────────────────────
describe("LicenseService.listByOwner", () => {
  it("should return licenses for owner's datasets via JOIN", async () => {
    const mockLicenses = [{ id: "l1", datasetId: "d1", spdxType: "MIT" }];
    const offset = vi.fn().mockResolvedValue(mockLicenses);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const service = new LicenseService(db);

    const result = await service.listByOwner("0xowner");
    expect(result).toEqual(mockLicenses);
    expect(innerJoin).toHaveBeenCalled();
  });

  it("should return empty for non-owner", async () => {
    const offset = vi.fn().mockResolvedValue([]);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const service = new LicenseService(db);

    const result = await service.listByOwner("0xnobody");
    expect(result).toEqual([]);
  });

  it("should respect filters", async () => {
    const offset = vi.fn().mockResolvedValue([]);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const service = new LicenseService(db);

    await service.listByOwner("0xowner", { datasetId: "d1", limit: 10, offset: 5 });
    expect(limit).toHaveBeenCalledWith(10);
    expect(offset).toHaveBeenCalledWith(5);
  });
});

// ─── AccessService ──────────────────────────────────────────
describe("AccessService.listByOwner", () => {
  function makeAccessDb(result: unknown) {
    const offset = vi.fn().mockResolvedValue(result);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    return { select, innerJoin } as any;
  }

  it("should return access logs for owner's datasets", async () => {
    const logs = [{ id: "a1", datasetId: "d1" }];
    const db = makeAccessDb(logs);
    const policyService = {} as any;
    const service = new AccessService(db, policyService);

    const result = await service.listByOwner("0xowner");
    expect(result).toEqual(logs);
  });

  it("should return empty for non-owner", async () => {
    const db = makeAccessDb([]);
    const policyService = {} as any;
    const service = new AccessService(db, policyService);

    const result = await service.listByOwner("0xnobody");
    expect(result).toEqual([]);
  });
});

describe("AccessService.countByOwner", () => {
  it("should return count for owner's datasets", async () => {
    const where = vi.fn().mockResolvedValue([{ count: 42 }]);
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const policyService = {} as any;
    const service = new AccessService(db, policyService);

    const result = await service.countByOwner("0xowner");
    expect(result).toBe(42);
  });
});

// ─── PolicyService ──────────────────────────────────────────
describe("PolicyService.listByOwner", () => {
  it("should return policies for owner's datasets via JOIN", async () => {
    const mockPolicies = [{ id: "p1", datasetId: "d1", version: 1 }];
    const offset = vi.fn().mockResolvedValue(mockPolicies);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const service = new PolicyService(db);

    const result = await service.listByOwner("0xowner");
    expect(result).toEqual(mockPolicies);
  });

  it("should return empty for non-owner", async () => {
    const offset = vi.fn().mockResolvedValue([]);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const service = new PolicyService(db);

    const result = await service.listByOwner("0xnobody");
    expect(result).toEqual([]);
  });
});

// ─── EvidenceService ────────────────────────────────────────
describe("EvidenceService.listByOwner", () => {
  it("should return evidence packs for owner's datasets", async () => {
    const mockPacks = [{ id: "e1", datasetId: "d1" }];
    const offset = vi.fn().mockResolvedValue(mockPacks);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const service = new EvidenceService(db);

    const result = await service.listByOwner("0xowner");
    expect(result).toEqual(mockPacks);
  });

  it("should return empty for non-owner", async () => {
    const offset = vi.fn().mockResolvedValue([]);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const service = new EvidenceService(db);

    const result = await service.listByOwner("0xnobody");
    expect(result).toEqual([]);
  });
});

// ─── AgentAuditService ──────────────────────────────────────
describe("AgentAuditService.listByOwner", () => {
  it("should return audit logs for owner's agents via JOIN", async () => {
    const mockLogs = [{ id: "al1", agentId: "ag1", action: "test" }];
    const offset = vi.fn().mockResolvedValue(mockLogs);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const service = new AgentAuditService(db);

    const result = await service.listByOwner("0xowner");
    expect(result).toEqual(mockLogs);
  });

  it("should return empty for non-owner", async () => {
    const offset = vi.fn().mockResolvedValue([]);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const service = new AgentAuditService(db);

    const result = await service.listByOwner("0xnobody");
    expect(result).toEqual([]);
  });
});

describe("AgentAuditService.countByOwner", () => {
  it("should return count for owner's agents", async () => {
    const where = vi.fn().mockResolvedValue([{ total: 15 }]);
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const service = new AgentAuditService(db);

    const result = await service.countByOwner("0xowner");
    expect(result).toBe(15);
  });

  it("should filter by status", async () => {
    const where = vi.fn().mockResolvedValue([{ total: 3 }]);
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as any;
    const service = new AgentAuditService(db);

    const result = await service.countByOwner("0xowner", { status: "denied" });
    expect(result).toBe(3);
  });
});
