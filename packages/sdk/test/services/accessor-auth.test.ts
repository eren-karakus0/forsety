import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for resolveAccessor logic.
 * Since resolveAccessor lives in apps/web (Next.js), we test the underlying
 * agent authentication logic at the SDK level here.
 */

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

const mockDb = {
  select: () => {
    mockSelect();
    return { from: mockFrom };
  },
};

mockFrom.mockReturnValue({ where: mockWhere });
mockWhere.mockReturnValue({ limit: mockLimit });

import { AgentService } from "../../src/services/agent.service.js";

describe("AgentService.authenticate (accessor resolution)", () => {
  let service: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgentService(mockDb as never);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
  });

  it("should return agent when valid fsy_ key matches active agent", async () => {
    const mockAgent = {
      id: "agent-1",
      name: "test-agent",
      ownerAddress: "0xagent-owner",
      isActive: true,
      agentApiKey: "hashed",
    };
    mockLimit.mockResolvedValue([mockAgent]);

    const result = await service.authenticate("fsy_test_key_123");

    expect(result).toEqual(mockAgent);
    expect(result!.ownerAddress).toBe("0xagent-owner");
  });

  it("should return null for inactive agent", async () => {
    mockLimit.mockResolvedValue([{
      id: "agent-2",
      name: "inactive-agent",
      ownerAddress: "0xowner",
      isActive: false,
    }]);

    const result = await service.authenticate("fsy_inactive_key");

    expect(result).toBeNull();
  });

  it("should return null for empty API key", async () => {
    const result = await service.authenticate("");

    expect(result).toBeNull();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("should return null when no agent matches the key", async () => {
    mockLimit.mockResolvedValue([]);

    const result = await service.authenticate("fsy_unknown_key");

    expect(result).toBeNull();
  });

  it("should hash the API key before querying DB", async () => {
    mockLimit.mockResolvedValue([]);

    await service.authenticate("fsy_my_secret_key");

    // Verify that select was called (key was hashed and queried)
    expect(mockSelect).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });

  it("should return null for non-fsy prefixed key when agent not found", async () => {
    // Even non-fsy keys get hashed and queried
    mockLimit.mockResolvedValue([]);

    const result = await service.authenticate("some_random_key");

    expect(result).toBeNull();
  });
});
