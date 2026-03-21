import { describe, it, expect, vi, beforeEach } from "vitest";
import { PolicyService } from "../../src/services/policy.service.js";

const mockUpdate = vi.fn();
const mockSelect = vi.fn();

const mockDb = {
  update: mockUpdate,
  select: mockSelect,
} as any;

describe("PolicyService - checkAndIncrementReads atomicity", () => {
  let service: PolicyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PolicyService(mockDb);
  });

  // Helper to mock getLatest() which uses: select().from().where().orderBy().limit(1)
  function mockGetLatest(result: unknown[]) {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(result),
          }),
        }),
      }),
    });
  }

  // Helper to mock update().set().where().returning()
  function mockAtomicUpdate(result: unknown[]) {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(result),
        }),
      }),
    });
  }

  describe("checkAndIncrementReads", () => {
    it("should return allowed=false when no policy exists", async () => {
      mockGetLatest([]);
      const result = await service.checkAndIncrementReads("uuid-1", "0xabc");
      expect(result.allowed).toBe(false);
      expect(result.policy).toBeNull();
    });

    it("should return allowed=false when accessor not in allowedAccessors", async () => {
      const policy = {
        id: "p1",
        allowedAccessors: ["0xother"],
        expiresAt: null,
        maxReads: null,
        readsConsumed: 0,
      };
      mockGetLatest([policy]);
      const result = await service.checkAndIncrementReads("uuid-1", "0xabc");
      expect(result.allowed).toBe(false);
      expect(result.policy).toEqual(policy);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should return allowed=false when policy expired", async () => {
      const policy = {
        id: "p1",
        allowedAccessors: ["0xabc"],
        expiresAt: new Date("2020-01-01"),
        maxReads: null,
        readsConsumed: 0,
      };
      mockGetLatest([policy]);
      const result = await service.checkAndIncrementReads("uuid-1", "0xabc");
      expect(result.allowed).toBe(false);
      expect(result.policy).toEqual(policy);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should return allowed=false when maxReads reached (atomic update returns empty)", async () => {
      const policy = {
        id: "p1",
        allowedAccessors: ["0xabc"],
        expiresAt: null,
        maxReads: 10,
        readsConsumed: 10,
      };
      mockGetLatest([policy]);
      // Atomic update fails (no row updated because readsConsumed >= maxReads)
      mockAtomicUpdate([]);

      const result = await service.checkAndIncrementReads("uuid-1", "0xabc");
      expect(result.allowed).toBe(false);
      expect(result.policy).toEqual(policy);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should return allowed=true with unlimited reads (maxReads null)", async () => {
      const policy = {
        id: "p1",
        allowedAccessors: ["0xabc"],
        expiresAt: null,
        maxReads: null,
        readsConsumed: 5,
      };
      const updatedPolicy = { ...policy, readsConsumed: 6 };
      mockGetLatest([policy]);
      mockAtomicUpdate([updatedPolicy]);

      const result = await service.checkAndIncrementReads("uuid-1", "0xabc");
      expect(result.allowed).toBe(true);
      expect(result.policy).toEqual(updatedPolicy);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should return allowed=true and increment when within limit", async () => {
      const policy = {
        id: "p1",
        allowedAccessors: ["0xabc"],
        expiresAt: null,
        maxReads: 10,
        readsConsumed: 5,
      };
      const updatedPolicy = { ...policy, readsConsumed: 6 };
      mockGetLatest([policy]);
      mockAtomicUpdate([updatedPolicy]);

      const result = await service.checkAndIncrementReads("uuid-1", "0xabc");
      expect(result.allowed).toBe(true);
      expect(result.policy).toEqual(updatedPolicy);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should allow wildcard accessor", async () => {
      const policy = {
        id: "p1",
        allowedAccessors: ["*"],
        expiresAt: null,
        maxReads: null,
        readsConsumed: 0,
      };
      const updatedPolicy = { ...policy, readsConsumed: 1 };
      mockGetLatest([policy]);
      mockAtomicUpdate([updatedPolicy]);

      const result = await service.checkAndIncrementReads("uuid-1", "0xanyone");
      expect(result.allowed).toBe(true);
      expect(result.policy).toEqual(updatedPolicy);
    });
  });
});
