import { describe, it, expect, vi, beforeEach } from "vitest";
import { EvidenceService } from "../../src/services/evidence.service.js";
import { ForsetyValidationError } from "../../src/errors.js";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockDb = {
  insert: mockInsert,
  select: mockSelect,
} as any;

describe("EvidenceService", () => {
  let service: EvidenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EvidenceService(mockDb);

    // Setup default mock for insert
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
  });

  describe("generatePack", () => {
    it("should throw when dataset not found", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.generatePack("non-existent")).rejects.toThrow(
        ForsetyValidationError
      );
    });

    it("should generate evidence pack with all data", async () => {
      const mockDataset = {
        id: "uuid-1",
        name: "Test",
        description: "Test desc",
        shelbyBlobId: "blob-1",
        shelbyBlobName: "forsety/test",
        blobHash: "sha256:abc",
        sizeBytes: 1024,
        ownerAddress: "0xabc",
      };

      const mockLicenses = [
        {
          id: "lic-1",
          spdxType: "MIT",
          grantorAddress: "0xabc",
          terms: { attribution: true },
          termsHash: "hash1",
        },
      ];

      const mockPolicies = [
        {
          id: "pol-1",
          version: 1,
          hash: "polhash",
          allowedAccessors: ["*"],
          maxReads: 100,
          readsConsumed: 5,
          expiresAt: null,
        },
      ];

      const mockAccessLogs = [
        {
          id: "log-1",
          accessorAddress: "0xdef",
          operationType: "read",
          blobHashAtRead: null,
          readProof: null,
          policyVersion: 1,
          policyHash: "polhash",
          timestamp: new Date("2026-03-06T12:00:00Z"),
        },
      ];

      // Mock chained calls — dataset, licenses, policies, access logs
      let callCount = 0;
      mockSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // dataset
            return {
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockDataset]),
              }),
            };
          }
          if (callCount === 2) {
            // licenses
            return {
              where: vi.fn().mockResolvedValue(mockLicenses),
            };
          }
          if (callCount === 3) {
            // policies
            return {
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(mockPolicies),
              }),
            };
          }
          // access logs
          return {
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockAccessLogs),
            }),
          };
        }),
      }));

      const result = await service.generatePack("uuid-1", "test-user");

      expect(result.json).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(result.hash.length).toBe(64); // SHA-256 hex
      expect(result.json.version).toBe("1.0.0");
      expect(result.json.dataset.name).toBe("Test");
      expect(result.json.licenses).toHaveLength(1);
      expect(result.json.policies).toHaveLength(1);
      expect(result.json.accessLog).toHaveLength(1);
    });
  });
});
