import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies ---
const mockGetById = vi.fn();
const mockArchive = vi.fn();
const mockRestore = vi.fn();
const mockGetWithLicense = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    datasets: {
      getById: mockGetById,
      archive: mockArchive,
      restore: mockRestore,
      getWithLicense: mockGetWithLicense,
    },
  }),
}));

const mockResolveAccessor = vi.fn();
const mockValidateAuth = vi.fn();

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: unknown[]) => mockResolveAccessor(...args),
    resolveAccessorStrict: (...args: unknown[]) => mockResolveAccessor(...args),
    validateAuth: (...args: unknown[]) => mockValidateAuth(...args),
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

import { GET, PATCH, DELETE } from "../../src/app/api/datasets/[id]/route";

function makeParams(id: string = "ds-1") {
  return { params: Promise.resolve({ id }) };
}

const MOCK_DATASET = {
  id: "ds-1",
  name: "test-dataset",
  ownerAddress: "0xowner",
  archivedAt: null,
};

describe("GET /api/datasets/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
  });

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/datasets/ds-1");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(401);
  });

  it("should return 404 when dataset not found", async () => {
    mockGetWithLicense.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/datasets/ds-1");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(404);
  });

  it("should return dataset on success", async () => {
    mockGetWithLicense.mockResolvedValue({ dataset: MOCK_DATASET, licenses: [] });
    const req = new NextRequest("http://localhost/api/datasets/ds-1");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(200);
  });

  it("should return 403 when caller is not owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xstranger", trusted: true });
    mockGetWithLicense.mockResolvedValue({ dataset: MOCK_DATASET, licenses: [] });
    const req = new NextRequest("http://localhost/api/datasets/ds-1");
    const res = await GET(req, makeParams());
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/datasets/[id] (archive)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
  });

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/datasets/ds-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(401);
  });

  it("should return 404 when dataset not found", async () => {
    mockGetById.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/datasets/ds-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(404);
  });

  it("should return 403 when caller is not owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xstranger", trusted: true });
    mockGetById.mockResolvedValue(MOCK_DATASET);
    const req = new NextRequest("http://localhost/api/datasets/ds-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("owner");
  });

  it("should archive when caller is owner", async () => {
    mockGetById.mockResolvedValue(MOCK_DATASET);
    mockArchive.mockResolvedValue({ ...MOCK_DATASET, archivedAt: new Date() });
    const req = new NextRequest("http://localhost/api/datasets/ds-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(200);
    expect(mockArchive).toHaveBeenCalledWith("ds-1");
  });
});

describe("PATCH /api/datasets/[id] (restore)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
  });

  it("should return 400 for invalid action", async () => {
    const req = new NextRequest("http://localhost/api/datasets/ds-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "invalid" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 403 when caller is not owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xstranger", trusted: true });
    mockGetById.mockResolvedValue(MOCK_DATASET);
    const req = new NextRequest("http://localhost/api/datasets/ds-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "restore" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(403);
  });

  it("should restore when caller is owner", async () => {
    mockGetById.mockResolvedValue({ ...MOCK_DATASET, archivedAt: new Date() });
    mockRestore.mockResolvedValue({ ...MOCK_DATASET, archivedAt: null });
    const req = new NextRequest("http://localhost/api/datasets/ds-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "restore" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(200);
    expect(mockRestore).toHaveBeenCalledWith("ds-1");
  });
});
