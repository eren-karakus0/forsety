import { describe, it, expect, vi, beforeEach } from "vitest";
import { memoryStore } from "../../src/tools/memory-store.js";
import { memoryRetrieve } from "../../src/tools/memory-retrieve.js";
import { memorySearch } from "../../src/tools/memory-search.js";
import { memoryDelete } from "../../src/tools/memory-delete.js";
import type { McpContext } from "../../src/types.js";

const mockRecallVault = {
  store: vi.fn(),
  retrieve: vi.fn(),
  search: vi.fn(),
  delete: vi.fn(),
} as any;

const ctx: McpContext = {
  agent: { id: "agent-1", name: "test-agent" } as any,
  startTime: Date.now(),
};

describe("Memory Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("memoryStore", () => {
    it("should store memory and return result", async () => {
      mockRecallVault.store.mockResolvedValue({
        id: "m1",
        contentHash: "abc123",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await memoryStore(
        { namespace: "default", key: "test-key", content: { value: 42 } },
        ctx,
        mockRecallVault
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.memoryId).toBe("m1");
      expect(parsed.contentHash).toBe("abc123");
      expect(mockRecallVault.store).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: "agent-1",
          key: "test-key",
        })
      );
    });

    it("should pass tags and ttlSeconds", async () => {
      mockRecallVault.store.mockResolvedValue({
        id: "m2",
        contentHash: "def456",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await memoryStore(
        {
          namespace: "ns1",
          key: "k2",
          content: {},
          tags: ["important"],
          ttlSeconds: 3600,
        },
        ctx,
        mockRecallVault
      );

      expect(mockRecallVault.store).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["important"],
          ttlSeconds: 3600,
        })
      );
    });
  });

  describe("memoryRetrieve", () => {
    it("should return memory when found", async () => {
      const memory = { id: "m1", key: "k1", content: { data: "hello" } };
      mockRecallVault.retrieve.mockResolvedValue(memory);

      const result = await memoryRetrieve(
        { namespace: "default", key: "k1" },
        ctx,
        mockRecallVault
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("m1");
    });

    it("should return null when not found", async () => {
      mockRecallVault.retrieve.mockResolvedValue(null);

      const result = await memoryRetrieve(
        { namespace: "default", key: "missing" },
        ctx,
        mockRecallVault
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toBeNull();
    });
  });

  describe("memorySearch", () => {
    it("should return search results", async () => {
      mockRecallVault.search.mockResolvedValue({
        items: [{ id: "m1" }, { id: "m2" }],
        total: 2,
      });

      const result = await memorySearch(
        { namespace: "default", tags: ["tag1"] },
        ctx,
        mockRecallVault
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.memories).toHaveLength(2);
      expect(parsed.total).toBe(2);
    });

    it("should handle empty results", async () => {
      mockRecallVault.search.mockResolvedValue({ items: [], total: 0 });

      const result = await memorySearch({}, ctx, mockRecallVault);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.memories).toHaveLength(0);
    });
  });

  describe("memoryDelete", () => {
    it("should delete existing memory", async () => {
      mockRecallVault.retrieve.mockResolvedValue({ id: "m1" });
      mockRecallVault.delete.mockResolvedValue(true);

      const result = await memoryDelete(
        { namespace: "default", key: "k1" },
        ctx,
        mockRecallVault
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deleted).toBe(true);
    });

    it("should return false for non-existent memory", async () => {
      mockRecallVault.retrieve.mockResolvedValue(null);

      const result = await memoryDelete(
        { namespace: "default", key: "missing" },
        ctx,
        mockRecallVault
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deleted).toBe(false);
    });
  });
});
