import { describe, it, expect, vi, beforeEach } from "vitest";
import { VectorSearchService } from "../../src/services/vector-search.service.js";
import { ForsetyValidationError } from "../../src/errors.js";
import type { Embedder } from "../../src/embeddings/local-embedder.js";

// Mock embedder that returns deterministic vectors
const mockEmbedder: Embedder = {
  embed: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
  embedBatch: vi.fn().mockResolvedValue([new Array(384).fill(0.1)]),
};

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockExecute = vi.fn();

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  execute: mockExecute,
} as any;

describe("VectorSearchService", () => {
  let service: VectorSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VectorSearchService(mockDb, mockEmbedder);
  });

  describe("embedDataset", () => {
    it("should throw when dataset not found", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.embedDataset("non-existent")).rejects.toThrow(
        ForsetyValidationError
      );
    });

    it("should throw when dataset has no text content", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "d1", name: "", description: null },
            ]),
          }),
        }),
      });

      await expect(service.embedDataset("d1")).rejects.toThrow(
        ForsetyValidationError
      );
    });

    it("should embed dataset and upsert into embeddings table", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "d1", name: "Test Dataset", description: "A test dataset" },
            ]),
          }),
        }),
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await service.embedDataset("d1");

      expect(mockEmbedder.embed).toHaveBeenCalledWith(
        "Test Dataset A test dataset"
      );
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe("embedMemory", () => {
    it("should throw when memory not found", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.embedMemory("non-existent")).rejects.toThrow(
        ForsetyValidationError
      );
    });

    it("should embed memory and upsert into embeddings table", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "m1",
                key: "test-key",
                content: { data: "test value" },
              },
            ]),
          }),
        }),
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await service.embedMemory("m1");

      expect(mockEmbedder.embed).toHaveBeenCalledWith(
        'test-key {"data":"test value"}'
      );
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe("searchDatasets", () => {
    it("should return empty array for empty query", async () => {
      const results = await service.searchDatasets("");
      expect(results).toEqual([]);
      expect(mockEmbedder.embed).not.toHaveBeenCalled();
    });

    it("should return empty array for whitespace-only query", async () => {
      const results = await service.searchDatasets("   ");
      expect(results).toEqual([]);
    });

    it("should search datasets with cosine similarity", async () => {
      mockExecute.mockResolvedValue({
        rows: [
          {
            source_id: "d1",
            text_content: "Test Dataset",
            score: 0.95,
          },
        ],
      });

      // Mock the secondary dataset fetch
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "d1",
              name: "Test Dataset",
              description: "A test",
            },
          ]),
        }),
      });

      const results = await service.searchDatasets("test query");

      expect(results).toHaveLength(1);
      expect(results[0]!.item.id).toBe("d1");
      expect(results[0]!.score).toBe(0.95);
      expect(mockEmbedder.embed).toHaveBeenCalledWith("test query");
    });

    it("should return empty when no results from DB", async () => {
      mockExecute.mockResolvedValue({ rows: [] });

      const results = await service.searchDatasets("test query");
      expect(results).toEqual([]);
    });
  });

  describe("searchMemories", () => {
    it("should return empty array for empty query", async () => {
      const results = await service.searchMemories("agent-1", "");
      expect(results).toEqual([]);
    });

    it("should search memories scoped to agent", async () => {
      mockExecute.mockResolvedValue({
        rows: [
          {
            source_id: "m1",
            text_content: "test-key test value",
            score: 0.88,
          },
        ],
      });

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "m1",
              key: "test-key",
              namespace: "default",
              content: { value: "test" },
              agentId: "agent-1",
            },
          ]),
        }),
      });

      const results = await service.searchMemories(
        "agent-1",
        "find test data"
      );

      expect(results).toHaveLength(1);
      expect(results[0]!.item.key).toBe("test-key");
      expect(results[0]!.score).toBe(0.88);
    });
  });

  describe("reindexAll", () => {
    it("should reindex all datasets", async () => {
      // First call: list all datasets
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([
          { id: "d1", name: "DS1", description: "First" },
          { id: "d2", name: "DS2", description: "Second" },
        ]),
      });

      // Per-dataset embed calls
      for (let i = 0; i < 2; i++) {
        mockSelect.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { id: `d${i + 1}`, name: `DS${i + 1}`, description: `Desc ${i + 1}` },
              ]),
            }),
          }),
        });

        mockInsert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
          }),
        });
      }

      const count = await service.reindexAll("dataset");
      expect(count).toBe(2);
    });

    it("should skip items that fail to embed", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([
          { id: "d1", name: "", description: null },
        ]),
      });

      // embedDataset will throw for empty name + no description
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "d1", name: "", description: null },
            ]),
          }),
        }),
      });

      const count = await service.reindexAll("dataset");
      expect(count).toBe(0);
    });
  });
});
