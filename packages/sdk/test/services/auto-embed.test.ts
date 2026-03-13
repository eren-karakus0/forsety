import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatasetService } from "../../src/services/dataset.service.js";
import { RecallVaultService } from "../../src/services/recall-vault.service.js";

describe("DatasetService auto-embed", () => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockDb = { insert: mockInsert, select: mockSelect } as any;
  const mockShelby = { uploadDataset: vi.fn() } as any;

  beforeEach(() => vi.clearAllMocks());

  it("should call embedDataset after upload", async () => {
    const mockEmbedDataset = vi.fn().mockResolvedValue(undefined);
    const vectorSearch = { embedDataset: mockEmbedDataset } as any;
    const service = new DatasetService(mockDb, mockShelby, vectorSearch);

    mockShelby.uploadDataset.mockResolvedValue({
      blobId: "b1", blobName: "forsety/test", hash: "sha:abc", sizeBytes: 100,
    });

    const mockDataset = { id: "d1", name: "Test" };
    const mockLicense = { id: "l1", spdxType: "MIT" };
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn()
          .mockResolvedValueOnce([mockDataset])
          .mockResolvedValueOnce([mockLicense]),
      }),
    });

    await service.upload({
      filePath: "/test.txt",
      name: "Test",
      ownerAddress: "0xabc",
      license: { spdxType: "MIT", grantorAddress: "0xabc" },
    });

    expect(mockEmbedDataset).toHaveBeenCalledWith("d1");
  });

  it("should not fail upload if embed fails", async () => {
    const mockEmbedDataset = vi.fn().mockRejectedValue(new Error("embed fail"));
    const vectorSearch = { embedDataset: mockEmbedDataset } as any;
    const service = new DatasetService(mockDb, mockShelby, vectorSearch);

    mockShelby.uploadDataset.mockResolvedValue({
      blobId: "b1", blobName: "forsety/test", hash: "sha:abc", sizeBytes: 100,
    });

    const mockDataset = { id: "d1", name: "Test" };
    const mockLicense = { id: "l1", spdxType: "MIT" };
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn()
          .mockResolvedValueOnce([mockDataset])
          .mockResolvedValueOnce([mockLicense]),
      }),
    });

    const result = await service.upload({
      filePath: "/test.txt",
      name: "Test",
      ownerAddress: "0xabc",
      license: { spdxType: "MIT", grantorAddress: "0xabc" },
    });

    expect(result.dataset).toEqual(mockDataset);
  });

  it("should work without vectorSearch (undefined)", async () => {
    const service = new DatasetService(mockDb, mockShelby);

    mockShelby.uploadDataset.mockResolvedValue({
      blobId: "b1", blobName: "forsety/test", hash: "sha:abc", sizeBytes: 100,
    });

    const mockDataset = { id: "d1", name: "Test" };
    const mockLicense = { id: "l1", spdxType: "MIT" };
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn()
          .mockResolvedValueOnce([mockDataset])
          .mockResolvedValueOnce([mockLicense]),
      }),
    });

    const result = await service.upload({
      filePath: "/test.txt",
      name: "Test",
      ownerAddress: "0xabc",
      license: { spdxType: "MIT", grantorAddress: "0xabc" },
    });

    expect(result.dataset).toEqual(mockDataset);
  });
});

describe("RecallVaultService auto-embed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should call embedMemory after store", async () => {
    const mockMemory = {
      id: "m1", agentId: "a1", namespace: "default", key: "k1",
      content: { data: "test" },
    };

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMemory]),
        }),
      }),
    });
    const db = { insert: mockInsert } as any;
    const mockEmbedMemory = vi.fn().mockResolvedValue(undefined);
    const vectorSearch = { embedMemory: mockEmbedMemory } as any;

    const service = new RecallVaultService(db, undefined, vectorSearch);
    await service.store({ agentId: "a1", key: "k1", content: { data: "test" } });

    expect(mockEmbedMemory).toHaveBeenCalledWith("m1");
  });

  it("should not fail store if embed fails", async () => {
    const mockMemory = {
      id: "m1", agentId: "a1", namespace: "default", key: "k1",
      content: { data: "test" },
    };

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMemory]),
        }),
      }),
    });
    const db = { insert: mockInsert } as any;
    const mockEmbedMemory = vi.fn().mockRejectedValue(new Error("embed fail"));
    const vectorSearch = { embedMemory: mockEmbedMemory } as any;

    const service = new RecallVaultService(db, undefined, vectorSearch);
    const result = await service.store({ agentId: "a1", key: "k1", content: { data: "test" } });

    expect(result).toEqual(mockMemory);
  });

  it("should work without vectorSearch (undefined)", async () => {
    const mockMemory = {
      id: "m1", agentId: "a1", namespace: "default", key: "k1",
      content: { data: "test" },
    };

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMemory]),
        }),
      }),
    });
    const db = { insert: mockInsert } as any;

    const service = new RecallVaultService(db);
    const result = await service.store({ agentId: "a1", key: "k1", content: { data: "test" } });

    expect(result).toEqual(mockMemory);
  });
});
