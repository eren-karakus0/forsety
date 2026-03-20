import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies ---
const mockListAll = vi.fn();
const mockAttach = vi.fn();
const mockGetById = vi.fn();
const mockUpdate = vi.fn();
const mockRevoke = vi.fn();
const mockDatasetGetById = vi.fn();

const mockListByOwner = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    licenses: {
      listAll: mockListAll,
      listByOwner: mockListByOwner,
      attach: mockAttach,
      getById: mockGetById,
      update: mockUpdate,
      revoke: mockRevoke,
    },
    datasets: {
      getById: mockDatasetGetById,
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

vi.mock("@/lib/api-error", async () => {
  const { NextResponse } = await import("next/server");
  return {
    apiError: vi.fn().mockImplementation((msg: string, _err: unknown, status = 500) =>
      new Response(JSON.stringify({ error: msg }), { status })
    ),
    validationError: vi.fn().mockImplementation(() =>
      NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    ),
  };
});

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { GET as ListLicenses, POST } from "../../src/app/api/licenses/route";
import { GET as GetLicense, PATCH, DELETE } from "../../src/app/api/licenses/[id]/route";

function makeParams(id: string = "lic-1") {
  return { params: Promise.resolve({ id }) };
}

const DS_ID = "550e8400-e29b-41d4-a716-446655440000";

const MOCK_LICENSE = {
  id: "lic-1",
  datasetId: DS_ID,
  spdxType: "MIT",
  grantorAddress: "0xowner",
  revokedAt: null,
};

const MOCK_DATASET = {
  id: DS_ID,
  name: "test",
  ownerAddress: "0xowner",
};

describe("GET /api/licenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
  });

  it("should return 401 when not authed", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/licenses");
    const res = await ListLicenses(req);
    expect(res.status).toBe(401);
  });

  it("should return licenses list", async () => {
    mockListByOwner.mockResolvedValue([MOCK_LICENSE]);
    const req = new NextRequest("http://localhost/api/licenses");
    const res = await ListLicenses(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("should return 400 for invalid limit", async () => {
    const req = new NextRequest("http://localhost/api/licenses?limit=abc");
    const res = await ListLicenses(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 for negative offset", async () => {
    const req = new NextRequest("http://localhost/api/licenses?offset=-5");
    const res = await ListLicenses(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/licenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
  });

  it("should return 401 when not authed", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/licenses", {
      method: "POST",
      body: JSON.stringify({ datasetId: DS_ID, spdxType: "MIT", grantorAddress: "0x1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 for missing fields", async () => {
    const req = new NextRequest("http://localhost/api/licenses", {
      method: "POST",
      body: JSON.stringify({ datasetId: DS_ID }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 403 when caller is not dataset owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xstranger", trusted: true });
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    const req = new NextRequest("http://localhost/api/licenses", {
      method: "POST",
      body: JSON.stringify({ datasetId: DS_ID, spdxType: "MIT", grantorAddress: "0x1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should attach license when caller is owner", async () => {
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    mockAttach.mockResolvedValue(MOCK_LICENSE);
    const req = new NextRequest("http://localhost/api/licenses", {
      method: "POST",
      body: JSON.stringify({ datasetId: DS_ID, spdxType: "MIT", grantorAddress: "0xowner" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

describe("GET /api/licenses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
  });

  it("should return 401 when not authed", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/licenses/lic-1");
    const res = await GetLicense(req, makeParams());
    expect(res.status).toBe(401);
  });

  it("should return 404 when not found", async () => {
    mockGetById.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/licenses/lic-1");
    const res = await GetLicense(req, makeParams());
    expect(res.status).toBe(404);
  });

  it("should return license when owner", async () => {
    mockGetById.mockResolvedValue(MOCK_LICENSE);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    const req = new NextRequest("http://localhost/api/licenses/lic-1");
    const res = await GetLicense(req, makeParams());
    expect(res.status).toBe(200);
  });

  it("should return 403 when not owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xstranger", trusted: true });
    mockGetById.mockResolvedValue(MOCK_LICENSE);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    const req = new NextRequest("http://localhost/api/licenses/lic-1");
    const res = await GetLicense(req, makeParams());
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/licenses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
  });

  it("should return 400 when no fields provided", async () => {
    const req = new NextRequest("http://localhost/api/licenses/lic-1", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 403 when caller is not owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xstranger", trusted: true });
    mockGetById.mockResolvedValue(MOCK_LICENSE);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    const req = new NextRequest("http://localhost/api/licenses/lic-1", {
      method: "PATCH",
      body: JSON.stringify({ spdxType: "Apache-2.0" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(403);
  });

  it("should update license when caller is owner", async () => {
    mockGetById.mockResolvedValue(MOCK_LICENSE);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    mockUpdate.mockResolvedValue({ ...MOCK_LICENSE, spdxType: "Apache-2.0" });
    const req = new NextRequest("http://localhost/api/licenses/lic-1", {
      method: "PATCH",
      body: JSON.stringify({ spdxType: "Apache-2.0" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/licenses/[id] (revoke)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
  });

  it("should return 403 when caller is not owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xstranger", trusted: true });
    mockGetById.mockResolvedValue(MOCK_LICENSE);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    const req = new NextRequest("http://localhost/api/licenses/lic-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(403);
  });

  it("should revoke license when caller is owner", async () => {
    mockGetById.mockResolvedValue(MOCK_LICENSE);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    mockRevoke.mockResolvedValue({ ...MOCK_LICENSE, revokedAt: new Date() });
    const req = new NextRequest("http://localhost/api/licenses/lic-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(200);
  });
});
