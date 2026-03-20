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

  it("should return dataset search results filtered by owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockSearchDatasets.mockResolvedValue([
      { item: { id: "ds-1", name: "Mine", ownerAddress: OWNER } },
      { item: { id: "ds-2", name: "Theirs", ownerAddress: STRANGER } },
    ]);

    const req = new NextRequest("http://localhost/api/search?q=test&type=dataset");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].item.ownerAddress).toBe(OWNER);
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
});
