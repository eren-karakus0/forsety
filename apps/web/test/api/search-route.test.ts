import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies before importing route ---

const mockSearchDatasets = vi.fn();
const mockSearchMemories = vi.fn();
const mockGetAgentById = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    vectorSearch: {
      searchDatasets: mockSearchDatasets,
      searchMemories: mockSearchMemories,
    },
    agents: { getById: mockGetAgentById },
  }),
}));

const mockResolveAccessor = vi.fn();

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: unknown[]) => mockResolveAccessor(...args),
    unauthorizedResponse: () => NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    checkAgentScope: (auth: Record<string, unknown>, permission: string) => {
      if (!auth.agentId) return { allowed: true };
      const perms = (auth.agentPermissions as string[]) ?? [];
      if (!perms.includes(permission)) return { allowed: false, error: `Agent lacks permission: ${permission}` };
      return { allowed: true };
    },
  };
});

vi.mock("@/lib/api-error", () => ({
  apiError: vi.fn().mockImplementation((msg: string) =>
    new Response(JSON.stringify({ error: msg }), { status: 500 })
  ),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { GET } from "../../src/app/api/search/route";

const OWNER = "0xowner";
const STRANGER = "0xstranger";

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockResolveAccessor.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/search?q=test&type=dataset");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("should return 400 for missing query", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/search?type=dataset");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid type", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/search?q=test&type=invalid");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("should pass owner filter to searchDatasets (DB-level filtering)", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockSearchDatasets.mockResolvedValue([
      { item: { id: "ds-1", name: "Mine", ownerAddress: OWNER } },
    ]);

    const req = new NextRequest("http://localhost/api/search?q=test&type=dataset");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    // Verify DB-level filtering params were passed
    expect(mockSearchDatasets).toHaveBeenCalledWith("test", 10, OWNER, undefined);
  });

  it("should return memory search results", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockGetAgentById.mockResolvedValue({ id: "ag-1", ownerAddress: OWNER });
    mockSearchMemories.mockResolvedValue([
      { item: { id: "mem-1", content: "test memory" } },
    ]);

    const req = new NextRequest("http://localhost/api/search?q=test&type=memory&agentId=ag-1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
  });

  it("should validate agentId ownership for memory search", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockGetAgentById.mockResolvedValue({ id: "ag-1", ownerAddress: OWNER });

    const req = new NextRequest("http://localhost/api/search?q=test&type=memory&agentId=ag-1");
    await GET(req);

    expect(mockGetAgentById).toHaveBeenCalledWith("ag-1");
  });

  it("should return 403 when agent is not owned by accessor", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: STRANGER, trusted: true });
    mockGetAgentById.mockResolvedValue({ id: "ag-1", ownerAddress: OWNER });

    const req = new NextRequest("http://localhost/api/search?q=test&type=memory&agentId=ag-1");
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it("should return 403 when agent lacks dataset.read permission for dataset search", async () => {
    mockResolveAccessor.mockResolvedValue({
      accessor: OWNER,
      trusted: true,
      agentId: "agent-1",
      agentPermissions: ["memory.read"],
      agentAllowedDatasets: [],
    });

    const req = new NextRequest("http://localhost/api/search?q=test&type=dataset");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("dataset.read");
  });

  it("should return 403 when agent lacks memory.read permission for memory search", async () => {
    mockResolveAccessor.mockResolvedValue({
      accessor: OWNER,
      trusted: true,
      agentId: "agent-2",
      agentPermissions: ["dataset.read"],
      agentAllowedDatasets: [],
    });

    const req = new NextRequest("http://localhost/api/search?q=test&type=memory&agentId=ag-1");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("memory.read");
  });

  // T4: Limit clamping tests — verify Math.min/Math.max/parseInt logic
  it("should fallback limit=0 to default 10 (falsy parseInt)", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockSearchDatasets.mockResolvedValue([]);

    // parseInt("0") || 10 = 10 because 0 is falsy
    const req = new NextRequest("http://localhost/api/search?q=test&type=dataset&limit=0");
    await GET(req);

    expect(mockSearchDatasets).toHaveBeenCalledWith("test", 10, OWNER, undefined);
  });

  it("should clamp negative limit to 1", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockSearchDatasets.mockResolvedValue([]);

    // parseInt("-5") || 10 = -5 (truthy), Math.max(-5, 1) = 1
    const req = new NextRequest("http://localhost/api/search?q=test&type=dataset&limit=-5");
    await GET(req);

    expect(mockSearchDatasets).toHaveBeenCalledWith("test", 1, OWNER, undefined);
  });

  it("should clamp limit=100 down to 50", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockSearchDatasets.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/search?q=test&type=dataset&limit=100");
    await GET(req);

    expect(mockSearchDatasets).toHaveBeenCalledWith("test", 50, OWNER, undefined);
  });

  it("should default NaN limit to 10", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockSearchDatasets.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/search?q=test&type=dataset&limit=abc");
    await GET(req);

    expect(mockSearchDatasets).toHaveBeenCalledWith("test", 10, OWNER, undefined);
  });

  it("should default empty limit to 10", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockSearchDatasets.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/search?q=test&type=dataset&limit=");
    await GET(req);

    expect(mockSearchDatasets).toHaveBeenCalledWith("test", 10, OWNER, undefined);
  });

  it("should default to 10 when no limit param", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockSearchDatasets.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/search?q=test&type=dataset");
    await GET(req);

    expect(mockSearchDatasets).toHaveBeenCalledWith("test", 10, OWNER, undefined);
  });

  it("should pass allowedDatasets to searchDatasets (DB-level filtering)", async () => {
    mockResolveAccessor.mockResolvedValue({
      accessor: OWNER,
      trusted: true,
      agentId: "agent-3",
      agentPermissions: ["dataset.read"],
      agentAllowedDatasets: ["ds-1"],
    });
    mockSearchDatasets.mockResolvedValue([
      { item: { id: "ds-1", name: "Allowed", ownerAddress: OWNER } },
    ]);

    const req = new NextRequest("http://localhost/api/search?q=test&type=dataset");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    // Verify DB-level filtering: ownerAddress + datasetIds passed to service
    expect(mockSearchDatasets).toHaveBeenCalledWith("test", 10, OWNER, ["ds-1"]);
  });
});
