import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies before importing route ---

const mockListByOwner = vi.fn();
const mockAttach = vi.fn();
const mockGetById = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    licenses: { listByOwner: mockListByOwner, attach: mockAttach },
    datasets: { getById: mockGetById },
  }),
}));

const mockResolveAccessor = vi.fn();
const mockResolveAccessorStrict = vi.fn();

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: unknown[]) => mockResolveAccessor(...args),
    resolveAccessorStrict: (...args: unknown[]) => mockResolveAccessorStrict(...args),
    unauthorizedResponse: () => NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
});

vi.mock("@/lib/api-error", () => ({
  apiError: vi.fn().mockImplementation((msg: string) =>
    new Response(JSON.stringify({ error: msg }), { status: 500 })
  ),
  validationError: vi.fn().mockImplementation(() =>
    new Response(JSON.stringify({ error: "Validation failed" }), { status: 400 })
  ),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { GET, POST } from "../../src/app/api/licenses/route";

const OWNER = "0xowner";
const STRANGER = "0xstranger";

describe("GET /api/licenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return licenses for owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockListByOwner.mockResolvedValue([{ id: "lic-1", datasetId: "ds-1" }]);

    const req = new NextRequest("http://localhost/api/licenses");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(mockListByOwner).toHaveBeenCalledWith(OWNER, expect.any(Object));
  });

  it("should return 401 when not authenticated", async () => {
    mockResolveAccessor.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/licenses");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/licenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should attach license for dataset owner", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });
    const datasetId = "550e8400-e29b-41d4-a716-446655440000";
    mockGetById.mockResolvedValue({ id: datasetId, ownerAddress: OWNER });
    mockAttach.mockResolvedValue({ id: "lic-1", datasetId, spdxType: "MIT" });

    const req = new NextRequest("http://localhost/api/licenses", {
      method: "POST",
      body: JSON.stringify({
        datasetId,
        spdxType: "MIT",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockAttach).toHaveBeenCalled();
  });

  it("should return 400 for invalid input", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });
    const datasetId = "550e8400-e29b-41d4-a716-446655440000";

    const req = new NextRequest("http://localhost/api/licenses", {
      method: "POST",
      body: JSON.stringify({ datasetId }), // missing spdxType
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 403 when not dataset owner", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: STRANGER, trusted: true });
    const datasetId = "550e8400-e29b-41d4-a716-446655440000";
    mockGetById.mockResolvedValue({ id: datasetId, ownerAddress: OWNER });

    const req = new NextRequest("http://localhost/api/licenses", {
      method: "POST",
      body: JSON.stringify({
        datasetId,
        spdxType: "MIT",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });
});
