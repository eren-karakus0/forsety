import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGeneratePack = vi.fn();
const mockDatasetGetById = vi.fn();
const mockResolveAccessorStrict = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    evidence: { generatePack: mockGeneratePack },
    datasets: { getById: mockDatasetGetById },
  }),
}));

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessorStrict: (...args: any[]) => mockResolveAccessorStrict(...args),
    unauthorizedResponse: () =>
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
});

vi.mock("@/lib/api-error", () => ({
  apiError: (msg: string, _err: unknown, status?: number) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: msg }, { status: status ?? 500 });
  },
}));

const { POST } = await import("@/app/api/datasets/[id]/evidence/route");

describe("POST /api/datasets/[id]/evidence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when unauthenticated", async () => {
    mockResolveAccessorStrict.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/datasets/ds-1/evidence", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "ds-1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when dataset not found", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xowner" });
    mockDatasetGetById.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/datasets/nonexistent/evidence", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nonexistent" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toContain("not found");
  });

  it("should return 403 when not dataset owner", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xother" });
    mockDatasetGetById.mockResolvedValue({ id: "ds-1", ownerAddress: "0xowner" });

    const req = new NextRequest("http://localhost/api/datasets/ds-1/evidence", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "ds-1" }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("should generate evidence pack for valid owner", async () => {
    const result = { json: { id: "pack-1" }, hash: "abc123" };
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xowner" });
    mockDatasetGetById.mockResolvedValue({ id: "ds-1", ownerAddress: "0xowner" });
    mockGeneratePack.mockResolvedValue(result);

    const req = new NextRequest("http://localhost/api/datasets/ds-1/evidence", {
      method: "POST",
      body: JSON.stringify({ generatedBy: "dashboard" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "ds-1" }) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.hash).toBe("abc123");
    expect(mockGeneratePack).toHaveBeenCalledWith("ds-1", "dashboard");
  });
});
