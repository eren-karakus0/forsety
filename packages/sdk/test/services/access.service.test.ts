import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccessService } from "../../src/services/access.service.js";
import { ForsetyValidationError, ForsetyAuthError } from "../../src/errors.js";

const mockInsert = vi.fn();
const mockDb = {
  insert: mockInsert,
  select: vi.fn(),
} as any;

const mockPolicyService = {
  checkAccess: vi.fn(),
  incrementReads: vi.fn(),
} as any;

describe("AccessService", () => {
  let service: AccessService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AccessService(mockDb, mockPolicyService);
  });

  describe("logAccess", () => {
    it("should throw validation error when required fields are missing", async () => {
      await expect(
        service.logAccess({
          datasetId: "",
          accessorAddress: "0xabc",
          operationType: "read",
        })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should throw auth error when access is denied", async () => {
      mockPolicyService.checkAccess.mockResolvedValue({
        allowed: false,
        policy: null,
      });

      await expect(
        service.logAccess({
          datasetId: "uuid-1",
          accessorAddress: "0xdenied",
          operationType: "read",
        })
      ).rejects.toThrow(ForsetyAuthError);
    });

    it("should log access and increment reads when allowed", async () => {
      const mockPolicy = { id: "p1", version: 1, hash: "hash1" };
      mockPolicyService.checkAccess.mockResolvedValue({
        allowed: true,
        policy: mockPolicy,
      });
      mockPolicyService.incrementReads.mockResolvedValue({
        ...mockPolicy,
        readsConsumed: 1,
      });

      const mockLog = { id: "log-1", operationType: "read" };
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockLog]),
        }),
      });

      const result = await service.logAccess({
        datasetId: "uuid-1",
        accessorAddress: "0xabc",
        operationType: "read",
      });

      expect(result).toEqual(mockLog);
      expect(mockPolicyService.incrementReads).toHaveBeenCalledWith("p1");
    });
  });
});
