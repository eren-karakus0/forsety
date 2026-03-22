import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCheckHealth = vi.fn();
const mockList = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    getShelby: () => ({ checkHealth: mockCheckHealth }),
    agents: { list: mockList },
  }),
}));

import { GET } from "../../src/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return ok when shelby is connected", async () => {
    mockCheckHealth.mockResolvedValue({
      connected: true,
      cliVersion: "0.0.26",
      context: "testnet",
    });
    mockList.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);

    const res = await GET();
    const body = await res.json();

    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("should return degraded when shelby is not connected", async () => {
    mockCheckHealth.mockResolvedValue({
      connected: false,
      cliVersion: "unknown",
      context: "unknown",
    });
    mockList.mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();

    expect(body.status).toBe("degraded");
  });

  it("should handle errors gracefully", async () => {
    mockCheckHealth.mockRejectedValue(new Error("CLI timeout"));
    mockList.mockRejectedValue(new Error("DB error"));

    const res = await GET();
    const body = await res.json();

    expect(body.status).toBe("degraded");
    expect(body.timestamp).toBeDefined();
  });

  it("should include details in non-production mode", async () => {
    mockCheckHealth.mockResolvedValue({
      connected: true,
      cliVersion: "0.0.26",
      context: "testnet",
    });
    mockList.mockResolvedValue([{ id: "a1" }]);

    const res = await GET();
    const body = await res.json();

    expect(body.service).toBe("forsety");
    expect(body.shelby).toBeDefined();
    expect(body.recallVault.registeredAgents).toBe(1);
  });
});
