import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShareService } from "../../src/services/share.service.js";
import { ForsetyValidationError } from "../../src/errors.js";

const mockInsert = vi.fn();
const mockSelect = vi.fn();

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
} as any;

const HMAC_SECRET = "test-hmac-secret-key-for-testing-only";

describe("ShareService", () => {
  let service: ShareService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ShareService(mockDb, HMAC_SECRET);
  });

  describe("createShareLink", () => {
    it("should throw when evidencePackId is missing", async () => {
      await expect(
        service.createShareLink({
          evidencePackId: "",
          mode: "full",
          ttlHours: 24,
        })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should throw when mode is missing", async () => {
      await expect(
        service.createShareLink({
          evidencePackId: "pack-1",
          mode: "" as any,
          ttlHours: 24,
        })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should throw when ttlHours is not a valid integer", async () => {
      // Set up evidence pack lookup mock
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "pack-1" }]),
          }),
        }),
      });

      await expect(
        service.createShareLink({
          evidencePackId: "pack-1",
          mode: "full",
          ttlHours: 0,
        })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should throw when ttlHours exceeds 720", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "pack-1" }]),
          }),
        }),
      });

      await expect(
        service.createShareLink({
          evidencePackId: "pack-1",
          mode: "full",
          ttlHours: 721,
        })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should throw when evidence pack not found", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.createShareLink({
          evidencePackId: "nonexistent",
          mode: "full",
          ttlHours: 24,
        })
      ).rejects.toThrow("Evidence pack not found");
    });

    it("should create share link with valid input", async () => {
      const mockLink = {
        id: "link-1",
        token: "abc123",
        mode: "full",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "pack-1" }]),
          }),
        }),
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockLink]),
        }),
      });

      const result = await service.createShareLink({
        evidencePackId: "pack-1",
        mode: "full",
        ttlHours: 24,
      });

      expect(result).toEqual(mockLink);
      expect(result.mode).toBe("full");
    });

    it("should create redacted share link", async () => {
      const mockLink = {
        id: "link-2",
        token: "def456",
        mode: "redacted",
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "pack-1" }]),
          }),
        }),
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockLink]),
        }),
      });

      const result = await service.createShareLink({
        evidencePackId: "pack-1",
        mode: "redacted",
        ttlHours: 1,
      });

      expect(result.mode).toBe("redacted");
    });
  });

  describe("resolveShareLink", () => {
    it("should return null for expired or invalid token", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.resolveShareLink("invalid-token");
      expect(result).toBeNull();
    });

    it("should return full pack data for valid token in full mode", async () => {
      const mockPack = {
        id: "pack-1",
        packJson: {
          dataset: { ownerAddress: "0xabcdef1234567890" },
          accessLog: [],
          policies: [],
          licenses: [],
        },
        packJsonCanonical: '{"dataset":{}}',
      };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: resolve share link
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{
                  id: "link-1",
                  evidencePackId: "pack-1",
                  token: "valid-token",
                  mode: "full",
                  expiresAt: new Date(Date.now() + 60000),
                }]),
              }),
            }),
          };
        }
        // Second call: get evidence pack
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockPack]),
            }),
          }),
        };
      });

      const result = await service.resolveShareLink("valid-token");
      expect(result).not.toBeNull();
      expect(result!.pack.packJson).toEqual(mockPack.packJson);
      expect(result!.pack.packJsonCanonical).toBe(mockPack.packJsonCanonical);
    });

    it("should return redacted pack data with truncated addresses", async () => {
      const mockPack = {
        id: "pack-1",
        packJson: {
          dataset: { ownerAddress: "0xabcdef1234567890abcdef" },
          accessLog: [
            { accessorAddress: "0x1234567890abcdef1234" },
          ],
          policies: [
            { allowedAccessors: ["0xabc123def456abc123", "*"] },
          ],
          licenses: [
            { grantorAddress: "0xgrantor1234567890ab" },
          ],
        },
        packJsonCanonical: '{"redacted":"canonical"}',
      };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{
                  id: "link-1",
                  evidencePackId: "pack-1",
                  token: "redacted-token",
                  mode: "redacted",
                  expiresAt: new Date(Date.now() + 60000),
                }]),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockPack]),
            }),
          }),
        };
      });

      const result = await service.resolveShareLink("redacted-token");
      expect(result).not.toBeNull();

      const packJson = result!.pack.packJson as Record<string, any>;
      // Owner address should be truncated
      expect(packJson.dataset.ownerAddress).toMatch(/^0xabcd\.\.\.cdef$/);
      // Accessor address should be truncated
      expect(packJson.accessLog[0].accessorAddress).toMatch(/^0x1234\.\.\.1234$/);
      // Wildcard should remain
      expect(packJson.policies[0].allowedAccessors[1]).toBe("*");
      // Grantor should be truncated
      expect(packJson.licenses[0].grantorAddress).toMatch(/^0xgran\.\.\.90ab$/);
      // packJsonCanonical should be null in redacted mode
      expect(result!.pack.packJsonCanonical).toBeNull();
    });

    it("should return null when evidence pack not found", async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{
                  id: "link-1",
                  evidencePackId: "pack-missing",
                  token: "orphan-token",
                  mode: "full",
                  expiresAt: new Date(Date.now() + 60000),
                }]),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      });

      const result = await service.resolveShareLink("orphan-token");
      expect(result).toBeNull();
    });
  });
});
