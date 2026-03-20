import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies before importing route ---

const mockListByOwner = vi.fn();
const mockUpload = vi.fn();
const mockGetById = vi.fn();
const mockAuthenticate = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    datasets: { listByOwner: mockListByOwner, upload: mockUpload, getById: mockGetById },
    agents: { authenticate: mockAuthenticate },
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
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { GET, POST } from "../../src/app/api/datasets/route";

function makeRequest(method: string = "GET") {
  return new NextRequest("http://localhost:3000/api/datasets", { method });
}

const OWNER = "0xowner";
const MOCK_DATASETS = [
  { id: "ds-1", name: "Dataset 1", ownerAddress: OWNER },
  { id: "ds-2", name: "Dataset 2", ownerAddress: OWNER },
];

describe("GET /api/datasets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return datasets for authenticated user", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockListByOwner.mockResolvedValue(MOCK_DATASETS);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.datasets).toEqual(MOCK_DATASETS);
    expect(mockListByOwner).toHaveBeenCalledWith(OWNER);
  });

  it("should return 401 when not authenticated", async () => {
    mockResolveAccessor.mockResolvedValue(null);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });
});

describe("POST /api/datasets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockResolveAccessorStrict.mockResolvedValue(null);

    const formData = new FormData();
    formData.append("file", new Blob(["test content"]), "test.csv");
    formData.append("name", "Test Dataset");
    formData.append("spdxType", "MIT");

    const req = new NextRequest("http://localhost:3000/api/datasets", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});
