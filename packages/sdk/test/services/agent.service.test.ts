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

describe("AgentService", () => {
  let service: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgentService(mockDb);
  });

  describe("register", () => {
    it("should throw when name is missing", async () => {
      await expect(
        service.register({ name: "", ownerAddress: "0xabc" })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should throw when ownerAddress is missing", async () => {
      await expect(
        service.register({ name: "agent-1", ownerAddress: "" })
      ).rejects.toThrow(ForsetyValidationError);
    });

    it("should register agent and return plaintext API key", async () => {
      const mockAgent = { id: "agent-uuid", name: "agent-1" };
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAgent]),
        }),
      });

      const result = await service.register({
        name: "agent-1",
        ownerAddress: "0xabc",
        allowedDatasets: ["ds-1"],
      });

      expect(result.agent).toEqual(mockAgent);
      expect(result.apiKey).toMatch(/^fsy_/);
      expect(result.apiKey.length).toBeGreaterThan(10);
    });

    it("should assign default permissions when none provided", async () => {
      const mockAgent = { id: "agent-uuid" };
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAgent]),
        }),
      });

      await service.register({
        name: "agent-1",
        ownerAddress: "0xabc",
        allowedDatasets: ["ds-1"],
      });

      const valuesCall = mockInsert.mock.results[0].value.values;
      const insertedValues = valuesCall.mock.calls[0][0];
      expect(insertedValues.permissions).toEqual([
        "memory.read",
        "memory.write",
        "dataset.read",
        "policy.read",
      ]);
    });

    it("should reject registration without allowedDatasets", async () => {
      await expect(
        service.register({ name: "agent-1", ownerAddress: "0xabc" })
      ).rejects.toThrow("allowedDatasets is required");
    });

    it("should reject registration with empty allowedDatasets", async () => {
      await expect(
        service.register({ name: "agent-1", ownerAddress: "0xabc", allowedDatasets: [] })
      ).rejects.toThrow("allowedDatasets is required");
    });
  });

  describe("authenticate", () => {
    it("should return null for empty apiKey", async () => {
      const result = await service.authenticate("");
      expect(result).toBeNull();
    });

    it("should return null when agent not found", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.authenticate("fsy_fake_key");
      expect(result).toBeNull();
    });

    it("should return null when agent is inactive", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "a1", isActive: false }]),
          }),
        }),
      });

      const result = await service.authenticate("fsy_inactive");
      expect(result).toBeNull();
    });

    it("should return agent when valid and active", async () => {
      const agent = { id: "a1", isActive: true, name: "test" };
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([agent]),
          }),
        }),
      });

      const result = await service.authenticate("fsy_valid_key");
      expect(result).toEqual(agent);
    });
  });

  describe("deactivate", () => {
    it("should set isActive to false", async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await service.deactivate("agent-uuid");
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});
