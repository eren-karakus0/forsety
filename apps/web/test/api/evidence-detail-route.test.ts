import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockEvidenceGetById = vi.fn();
const mockDatasetGetById = vi.fn();
const mockResolveAccessor = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    evidence: { getById: mockEvidenceGetById },
    datasets: { getById: mockDatasetGetById },
  }),
}));

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: any[]) => mockResolveAccessor(...args),
    unauthorizedResponse: () =>
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
});

vi.mock("@/lib/api-error", () => ({
  apiError: (msg: string) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: msg }, { status: 500 });
  },
}));

const { GET } = await import("@/app/api/evidence/[id]/route");

describe("GET /api/evidence/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when unauthenticated", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/evidence/pack-1");
    const res = await GET(req, { params: Promise.resolve({ id: "pack-1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when pack not found", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner" });
    mockEvidenceGetById.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/evidence/nonexistent");
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toContain("not found");
  });

  it("should return 403 when not dataset owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xother" });
    mockEvidenceGetById.mockResolvedValue({ id: "pack-1", datasetId: "ds-1" });
    mockDatasetGetById.mockResolvedValue({ id: "ds-1", ownerAddress: "0xowner" });

    const req = new NextRequest("http://localhost/api/evidence/pack-1");
    const res = await GET(req, { params: Promise.resolve({ id: "pack-1" }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("should return pack data when owner", async () => {
    const pack = { id: "pack-1", datasetId: "ds-1", packHash: "hash" };
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner" });
    mockEvidenceGetById.mockResolvedValue(pack);
    mockDatasetGetById.mockResolvedValue({ id: "ds-1", ownerAddress: "0xowner" });

    const req = new NextRequest("http://localhost/api/evidence/pack-1");
    const res = await GET(req, { params: Promise.resolve({ id: "pack-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(pack);
  });
});
