import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";
import { ShieldStoreService } from "../../src/services/shield-store.service.js";
import { RecallVaultService } from "../../src/services/recall-vault.service.js";
import { encrypt } from "../../src/crypto/aes.js";
import { deriveKey } from "../../src/crypto/key-derivation.js";
import { ForsetyValidationError } from "../../src/errors.js";

const mockInsert = vi.fn();
const mockSelect = vi.fn();

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
} as any;

// Mock RecallVaultService
const mockStore = vi.fn();
const mockRetrieve = vi.fn();

const mockRecallVault = {
  store: mockStore,
  retrieve: mockRetrieve,
} as unknown as RecallVaultService;

describe("ShieldStoreService", () => {
  let service: ShieldStoreService;
  const key = deriveKey(randomBytes(64));

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ShieldStoreService(mockDb, mockRecallVault);
  });

  describe("storeEncrypted", () => {
    it("should encrypt content and store via RecallVault", async () => {
      const storedMemory = { id: "m1", content: {} };
      mockStore.mockResolvedValue(storedMemory);

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await service.storeEncrypted(
        {
          agentId: "a1",
          key: "secret-data",
          content: { password: "hunter2" },
        },
        key
      );

      expect(result).toEqual(storedMemory);
      expect(mockStore).toHaveBeenCalled();

      // Verify content passed to store is encrypted
      const storedContent = mockStore.mock.calls[0]?.[0]?.content;
      expect(storedContent._encrypted).toBe(true);
      expect(storedContent.ciphertext).toBeDefined();
      expect(storedContent.iv).toBeDefined();
    });
  });

  describe("retrieveDecrypted", () => {
    it("should return null when memory not found", async () => {
      mockRetrieve.mockResolvedValue(null);

      const result = await service.retrieveDecrypted(
        "a1",
        "default",
        "key1",
        key
      );

      expect(result).toBeNull();
    });

    it("should decrypt encrypted content", async () => {
      const original = { password: "hunter2" };
      const encrypted = encrypt(JSON.stringify(original), key);

      mockRetrieve.mockResolvedValue({
        id: "m1",
        content: encrypted,
        key: "secret",
        namespace: "default",
      });

      const result = await service.retrieveDecrypted(
        "a1",
        "default",
        "secret",
        key
      );

      expect(result).not.toBeNull();
      expect(result!.content).toEqual(original);
    });

    it("should return unencrypted content as-is", async () => {
      const plainContent = { data: "not encrypted" };

      mockRetrieve.mockResolvedValue({
        id: "m1",
        content: plainContent,
        key: "plain",
        namespace: "default",
      });

      const result = await service.retrieveDecrypted(
        "a1",
        "default",
        "plain",
        key
      );

      expect(result!.content).toEqual(plainContent);
    });

    it("should throw with wrong decryption key", async () => {
      const encrypted = encrypt(JSON.stringify({ secret: "data" }), key);
      const wrongKey = deriveKey(randomBytes(64));

      mockRetrieve.mockResolvedValue({
        id: "m1",
        content: encrypted,
        key: "secret",
        namespace: "default",
      });

      await expect(
        service.retrieveDecrypted("a1", "default", "secret", wrongKey)
      ).rejects.toThrow(ForsetyValidationError);
    });
  });

  describe("isEncrypted", () => {
    it("should return true when encryption metadata exists", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "em1" }]),
          }),
        }),
      });

      const result = await service.isEncrypted("m1");
      expect(result).toBe(true);
    });

    it("should return false when no encryption metadata", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.isEncrypted("m1");
      expect(result).toBe(false);
    });
  });
});
