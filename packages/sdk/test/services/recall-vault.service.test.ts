import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecallVaultService } from "../../src/services/recall-vault.service.js";
import { ForsetyValidationError } from "../../src/errors.js";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
  delete: mockDelete,
} as any;

describe("RecallVaultService", () => {
  let service: RecallVaultService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecallVaultService(mockDb);
  });

  describe("store", () => {
    it("should throw when agentId is missing", async () => {
      await expect(
        service.store({ agentId: "", key: "k1", content: {} })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should throw when key is missing", async () => {
      await expect(
        service.store({ agentId: "a1", key: "", content: {} })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should insert or upsert memory atomically", async () => {
      const mockMemory = { id: "m1", key: "k1", contentHash: "abc" };
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockMemory]),
          }),
        }),
      });

      const result = await service.store({
        agentId: "a1",
        key: "k1",
        content: { data: "hello" },
      });

      expect(result).toEqual(mockMemory);
      expect(mockInsert).toHaveBeenCalled();
    });

    it("should compute TTL expiresAt when ttlSeconds provided", async () => {
      const mockMemory = { id: "m2", expiresAt: new Date() };
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockMemory]),
          }),
        }),
      });

      const result = await service.store({
        agentId: "a1",
        key: "k2",
        content: { data: "temp" },
        ttlSeconds: 3600,
      });

      expect(result).toEqual(mockMemory);
    });
  });

  describe("retrieve", () => {
    it("should return memory when found", async () => {
      const memory = { id: "m1", key: "k1", expiresAt: null };
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([memory]),
          }),
        }),
      });

      const result = await service.retrieve("a1", "default", "k1");
      expect(result).toEqual(memory);
    });

    it("should return null when not found", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.retrieve("a1", "default", "k1");
      expect(result).toBeNull();
    });

    it("should return null and delete when expired", async () => {
      const expired = {
        id: "m1",
        key: "k1",
        expiresAt: new Date("2020-01-01"),
      };
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([expired]),
          }),
        }),
      });

      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await service.retrieve("a1", "default", "k1");
      expect(result).toBeNull();
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should return true when memory deleted", async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "m1" }]),
        }),
      });

      const result = await service.delete("a1", "m1");
      expect(result).toBe(true);
    });

    it("should return false when memory not found", async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.delete("a1", "m999");
      expect(result).toBe(false);
    });
  });

  describe("exportSnapshot", () => {
    it("should return json and hash", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              { id: "m1", key: "k1", content: { data: "test" } },
            ]),
          }),
        }),
      });

      const result = await service.exportSnapshot("a1", "default");
      expect(result.json.agentId).toBe("a1");
      expect(result.json.namespace).toBe("default");
      expect(result.json.memories).toHaveLength(1);
      expect(result.hash).toBeDefined();
      expect(result.hash.length).toBe(64);
    });
  });

  describe("backupToShelby", () => {
    it("should throw when shelby not configured", async () => {
      await expect(service.backupToShelby("m1")).rejects.toThrow(
        ForsetyValidationError
      );
    });
  });
});
