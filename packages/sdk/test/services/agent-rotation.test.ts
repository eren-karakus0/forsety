import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentService } from "../../src/services/agent.service.js";
import { ForsetyValidationError } from "../../src/errors.js";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
} as any;

describe("AgentService.rotateApiKey", () => {
  let service: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgentService(mockDb);
  });

  it("should return null for non-existent agent", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await service.rotateApiKey("non-existent");
    expect(result).toBeNull();
  });

  it("should throw for inactive agent", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: "a1", isActive: false, ownerAddress: "0x1" },
          ]),
        }),
      }),
    });

    await expect(service.rotateApiKey("a1")).rejects.toThrow(
      ForsetyValidationError
    );
    await expect(service.rotateApiKey("a1")).rejects.toThrow("inactive");
  });

  it("should return new API key for active agent", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: "a1", isActive: true, ownerAddress: "0x1" },
          ]),
        }),
      }),
    });

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const result = await service.rotateApiKey("a1");
    expect(result).not.toBeNull();
    expect(result!.apiKey).toMatch(/^fsy_/);
    expect(result!.apiKey.length).toBeGreaterThan(10);
  });

  it("should generate a different key each time", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: "a1", isActive: true, ownerAddress: "0x1" },
          ]),
        }),
      }),
    });

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const result1 = await service.rotateApiKey("a1");
    const result2 = await service.rotateApiKey("a1");
    expect(result1!.apiKey).not.toBe(result2!.apiKey);
  });
});
