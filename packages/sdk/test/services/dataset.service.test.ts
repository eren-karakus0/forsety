import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatasetService } from "../../src/services/dataset.service.js";
import { ForsetyValidationError } from "../../src/errors.js";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockDb = {
  insert: mockInsert,
  select: mockSelect,
} as any;

const mockShelby = {
  uploadDataset: vi.fn(),
} as any;

describe("DatasetService", () => {
  let service: DatasetService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DatasetService(mockDb, mockShelby);
  });

  describe("upload", () => {
    it("should throw validation error when name is missing", async () => {
      await expect(
        service.upload({
          filePath: "/test.txt",
          name: "",
          ownerAddress: "0xabc",
          license: { spdxType: "MIT", grantorAddress: "0xabc" },
        })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should throw validation error when ownerAddress is missing", async () => {
      await expect(
        service.upload({
          filePath: "/test.txt",
          name: "Test",
          ownerAddress: "",
          license: { spdxType: "MIT", grantorAddress: "0xabc" },
        })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should upload dataset and create records", async () => {
      mockShelby.uploadDataset.mockResolvedValue({
        blobId: "blob-1",
        blobName: "forsety/test",
        hash: "sha256:abc",
        sizeBytes: 1024,
      });

      const mockDataset = { id: "uuid-1", name: "Test" };
      const mockLicense = { id: "uuid-2", spdxType: "MIT" };

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
      expect(result.license).toEqual(mockLicense);
      expect(mockShelby.uploadDataset).toHaveBeenCalledOnce();
    });
  });

  describe("list", () => {
    it("should query all datasets", async () => {
      const mockDatasets = [{ id: "1", name: "A" }];
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockDatasets),
        }),
      });

      const result = await service.list();
      expect(result).toEqual(mockDatasets);
    });
  });

  describe("getById", () => {
    it("should return null for non-existent dataset", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getById("non-existent");
      expect(result).toBeNull();
    });

    it("should return dataset when found", async () => {
      const mockDataset = { id: "uuid-1", name: "Test" };
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockDataset]),
          }),
        }),
      });

      const result = await service.getById("uuid-1");
      expect(result).toEqual(mockDataset);
    });
  });
});
