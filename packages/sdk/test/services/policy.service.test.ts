import { describe, it, expect, vi, beforeEach } from "vitest";
import { PolicyService } from "../../src/services/policy.service.js";
import { ForsetyValidationError } from "../../src/errors.js";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

// Transaction mock: calls callback with the same mock db (tx)
const mockTransaction = vi.fn(async (cb: (tx: any) => Promise<any>) => {
  return cb({ insert: mockInsert, select: mockSelect, update: mockUpdate });
});

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
  transaction: mockTransaction,
} as any;

describe("PolicyService", () => {
  let service: PolicyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PolicyService(mockDb);
  });

  describe("create", () => {
    it("should throw when datasetId is missing", async () => {
      await expect(
        service.create({
          datasetId: "",
          allowedAccessors: ["0xabc"],
        })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should throw when allowedAccessors is empty", async () => {
      await expect(
        service.create({
          datasetId: "uuid-1",
          allowedAccessors: [],
        })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should create policy with auto-incremented version", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ maxVersion: 2 }]),
        }),
      });

      const mockPolicy = { id: "policy-1", version: 3 };
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPolicy]),
        }),
      });

      const result = await service.create({
        datasetId: "uuid-1",
        allowedAccessors: ["0xabc"],
        maxReads: 100,
      });

      expect(result).toEqual(mockPolicy);
    });
  });

  describe("checkAccess", () => {
    it("should deny when no policies exist", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.checkAccess("uuid-1", "0xabc");
      expect(result.allowed).toBe(false);
      expect(result.policy).toBeNull();
    });

    it("should allow when accessor is in allowedAccessors", async () => {
      const policy = {
        id: "p1",
        allowedAccessors: ["0xabc"],
        expiresAt: null,
        maxReads: null,
        readsConsumed: 0,
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([policy]),
          }),
        }),
      });

      const result = await service.checkAccess("uuid-1", "0xabc");
      expect(result.allowed).toBe(true);
    });

    it("should allow wildcard accessor", async () => {
      const policy = {
        id: "p1",
        allowedAccessors: ["*"],
        expiresAt: null,
        maxReads: null,
        readsConsumed: 0,
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([policy]),
          }),
        }),
      });

      const result = await service.checkAccess("uuid-1", "0xanyone");
      expect(result.allowed).toBe(true);
    });

    it("should deny when accessor not in list", async () => {
      const policy = {
        id: "p1",
        allowedAccessors: ["0xabc"],
        expiresAt: null,
        maxReads: null,
        readsConsumed: 0,
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([policy]),
          }),
        }),
      });

      const result = await service.checkAccess("uuid-1", "0xother");
      expect(result.allowed).toBe(false);
    });

    it("should deny when policy expired", async () => {
      const policy = {
        id: "p1",
        allowedAccessors: ["0xabc"],
        expiresAt: new Date("2020-01-01"),
        maxReads: null,
        readsConsumed: 0,
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([policy]),
          }),
        }),
      });

      const result = await service.checkAccess("uuid-1", "0xabc");
      expect(result.allowed).toBe(false);
    });

    it("should deny when max reads exceeded", async () => {
      const policy = {
        id: "p1",
        allowedAccessors: ["0xabc"],
        expiresAt: null,
        maxReads: 10,
        readsConsumed: 10,
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([policy]),
          }),
        }),
      });

      const result = await service.checkAccess("uuid-1", "0xabc");
      expect(result.allowed).toBe(false);
    });
  });
});
