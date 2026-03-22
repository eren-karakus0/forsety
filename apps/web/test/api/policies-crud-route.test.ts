import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies before importing route ---

const mockListByOwner = vi.fn();
const mockGetByDatasetId = vi.fn();
const mockCreate = vi.fn();
const mockGetById = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    policies: {
      listByOwner: mockListByOwner,
      getByDatasetId: mockGetByDatasetId,
      create: mockCreate,
    },
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

import { GET, POST } from "../../src/app/api/policies/route";

const OWNER = "0xaaa111bbb222ccc333ddd444eee555fff666";
const STRANGER = "0xfff666eee555ddd444ccc333bbb222aaa111";

describe("GET /api/policies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return policies for authenticated user", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockListByOwner.mockResolvedValue([{ id: "p1", datasetId: "ds-1" }]);

    const req = new NextRequest("http://localhost/api/policies");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.policies).toHaveLength(1);
    expect(mockListByOwner).toHaveBeenCalledWith(OWNER);
  });

  it("should return policies for specific datasetId", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockGetById.mockResolvedValue({ id: "ds-1", ownerAddress: OWNER });
    mockGetByDatasetId.mockResolvedValue([{ id: "p1" }]);

    const req = new NextRequest("http://localhost/api/policies?datasetId=ds-1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.policies).toHaveLength(1);
  });

  it("should return 401 when not authenticated", async () => {
    mockResolveAccessor.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/policies");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/policies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create policy for dataset owner", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });
    const datasetId = "550e8400-e29b-41d4-a716-446655440000";
    mockGetById.mockResolvedValue({ id: datasetId, ownerAddress: OWNER });
    mockCreate.mockResolvedValue({ id: "p1", datasetId });

    const req = new NextRequest("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({
        datasetId,
        allowedAccessors: [OWNER],
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalled();
  });

  it("should return 400 for invalid input (missing datasetId)", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({ allowedAccessors: [OWNER] }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 403 when not dataset owner", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: STRANGER, trusted: true });
    const datasetId = "550e8400-e29b-41d4-a716-446655440000";
    mockGetById.mockResolvedValue({ id: datasetId, ownerAddress: OWNER });

    const req = new NextRequest("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({
        datasetId,
        allowedAccessors: [STRANGER],
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("should return 404 when dataset not found", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });
    const datasetId = "550e8400-e29b-41d4-a716-446655440000";
    mockGetById.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({
        datasetId,
        allowedAccessors: [OWNER],
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  // T5: Policy field validation tests (Zod schema enforcement)
  it("should return 400 for empty allowedAccessors array", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({
        datasetId: "550e8400-e29b-41d4-a716-446655440000",
        allowedAccessors: [],
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 400 for empty string in allowedAccessors", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({
        datasetId: "550e8400-e29b-41d4-a716-446655440000",
        allowedAccessors: [""],
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 400 for negative maxReads", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({
        datasetId: "550e8400-e29b-41d4-a716-446655440000",
        allowedAccessors: [OWNER],
        maxReads: -1,
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 400 for float maxReads", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({
        datasetId: "550e8400-e29b-41d4-a716-446655440000",
        allowedAccessors: [OWNER],
        maxReads: 3.5,
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid UUID datasetId", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({
        datasetId: "not-a-uuid",
        allowedAccessors: [OWNER],
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid datetime expiresAt", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({
        datasetId: "550e8400-e29b-41d4-a716-446655440000",
        allowedAccessors: [OWNER],
        expiresAt: "not-a-date",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
