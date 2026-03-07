import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthMiddleware } from "../../src/middleware/auth.js";

describe("AuthMiddleware", () => {
  const mockAgentService = {
    authenticate: vi.fn(),
    touchLastSeen: vi.fn().mockResolvedValue(undefined),
  } as any;

  let auth: AuthMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    auth = new AuthMiddleware(mockAgentService);
  });

  it("should return null for empty apiKey", async () => {
    const result = await auth.authenticate("");
    expect(result).toBeNull();
  });

  it("should return null when agent not found", async () => {
    mockAgentService.authenticate.mockResolvedValue(null);
    const result = await auth.authenticate("fsy_invalid");
    expect(result).toBeNull();
  });

  it("should return agent and touch lastSeen on success", async () => {
    const agent = { id: "a1", name: "test", isActive: true };
    mockAgentService.authenticate.mockResolvedValue(agent);

    const result = await auth.authenticate("fsy_valid");
    expect(result).toEqual(agent);
    expect(mockAgentService.touchLastSeen).toHaveBeenCalledWith("a1");
  });
});
