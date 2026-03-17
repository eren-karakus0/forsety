import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies ---
const mockGetById = vi.fn();
const mockRotateApiKey = vi.fn();
const mockAuditLog = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    agents: {
      getById: mockGetById,
      rotateApiKey: mockRotateApiKey,
    },
    agentAudit: {
      log: mockAuditLog,
    },
  }),
}));

const mockResolveAccessor = vi.fn();

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: unknown[]) => mockResolveAccessor(...args),
    resolveAccessorStrict: (...args: unknown[]) => mockResolveAccessor(...args),
    unauthorizedResponse: vi.fn().mockReturnValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    ),
  };
});

vi.mock("@/lib/api-error", () => ({
  apiError: vi.fn().mockImplementation((msg: string, _err: unknown, status = 500) =>
    new Response(JSON.stringify({ error: msg }), { status })
  ),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { POST } from "../../src/app/api/agents/[id]/rotate-key/route";

function makeParams(id: string = "agent-1") {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/agents/[id]/rotate-key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/agents/agent-1/rotate-key", {
      method: "POST",
    });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(401);
  });

  it("should return 404 when agent not found", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockGetById.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/agents/agent-1/rotate-key", {
      method: "POST",
    });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });

  it("should return 403 when caller is not agent owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xother", trusted: true });
    mockGetById.mockResolvedValue({
      id: "agent-1",
      ownerAddress: "0xowner",
      isActive: true,
    });

    const req = new NextRequest("http://localhost/api/agents/agent-1/rotate-key", {
      method: "POST",
    });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("owner");
  });

  it("should return 400 when agent is inactive", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockGetById.mockResolvedValue({
      id: "agent-1",
      ownerAddress: "0xowner",
      isActive: false,
    });
    mockRotateApiKey.mockRejectedValue(
      new Error("Cannot rotate key for inactive agent")
    );

    const req = new NextRequest("http://localhost/api/agents/agent-1/rotate-key", {
      method: "POST",
    });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 200 with new API key for valid owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockGetById.mockResolvedValue({
      id: "agent-1",
      ownerAddress: "0xowner",
      isActive: true,
    });
    mockRotateApiKey.mockResolvedValue({ apiKey: "fsy_new_key_123" });

    const req = new NextRequest("http://localhost/api/agents/agent-1/rotate-key", {
      method: "POST",
    });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.apiKey).toBe("fsy_new_key_123");
    expect(body.warning).toBeDefined();

    // Audit log should be called
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent-1",
        action: "agent.key_rotated",
        status: "success",
      })
    );
  });
});
