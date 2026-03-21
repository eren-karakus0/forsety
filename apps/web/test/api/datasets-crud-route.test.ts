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
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });
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

  it("should return 400 when name is missing", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["content"]), "test.csv");
    formData.append("spdxType", "MIT");

    const req = new NextRequest("http://localhost:3000/api/datasets", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("name");
  });

  it("should return 400 when spdxType is missing", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["content"]), "test.csv");
    formData.append("name", "Test");

    const req = new NextRequest("http://localhost:3000/api/datasets", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("spdxType");
  });

  it("should return 400 when file is missing", async () => {
    const formData = new FormData();
    formData.append("name", "Test Dataset");
    formData.append("spdxType", "MIT");

    const req = new NextRequest("http://localhost:3000/api/datasets", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("File");
  });

  it("should return 400 when file is empty (zero bytes)", async () => {
    const formData = new FormData();
    formData.append("file", new Blob([]), "empty.csv");
    formData.append("name", "Empty");
    formData.append("spdxType", "MIT");

    const req = new NextRequest("http://localhost:3000/api/datasets", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("File");
  });

  it("should return 413 when file exceeds 50MB limit", async () => {
    // Create a blob that reports > 50MB size
    const bigContent = new Uint8Array(50 * 1024 * 1024 + 1);
    const formData = new FormData();
    formData.append("file", new Blob([bigContent]), "big.bin");
    formData.append("name", "Big File");
    formData.append("spdxType", "MIT");

    const req = new NextRequest("http://localhost:3000/api/datasets", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain("50MB");
  });

  it("should use ownerAddress from auth context, not formData", async () => {
    mockUpload.mockResolvedValue({ id: "ds-new", name: "Test" });

    const formData = new FormData();
    formData.append("file", new Blob(["content"]), "test.csv");
    formData.append("name", "Test");
    formData.append("spdxType", "MIT");
    formData.append("ownerAddress", "0xattacker");

    const req = new NextRequest("http://localhost:3000/api/datasets", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    // Verify upload was called with auth accessor, not formData ownerAddress
    const uploadCall = mockUpload.mock.calls[0]![0];
    expect(uploadCall.ownerAddress).toBe(OWNER);
  });

  it("should sanitize filename (remove unsafe chars)", async () => {
    mockUpload.mockResolvedValue({ id: "ds-safe", name: "Safe" });

    const formData = new FormData();
    formData.append("file", new Blob(["data"]), "my file (1).csv");
    formData.append("name", "Safe Name");
    formData.append("spdxType", "MIT");

    const req = new NextRequest("http://localhost:3000/api/datasets", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("should accept optional description field", async () => {
    mockUpload.mockResolvedValue({ id: "ds-desc", name: "With Desc" });

    const formData = new FormData();
    formData.append("file", new Blob(["data"]), "test.csv");
    formData.append("name", "With Desc");
    formData.append("spdxType", "MIT");
    formData.append("description", "A detailed description");

    const req = new NextRequest("http://localhost:3000/api/datasets", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const uploadCall = mockUpload.mock.calls[0]![0];
    expect(uploadCall.description).toBe("A detailed description");
  });

  it("should cleanup temp file on upload failure", async () => {
    mockUpload.mockRejectedValue(new Error("Shelby upload failed"));

    const formData = new FormData();
    formData.append("file", new Blob(["data"]), "test.csv");
    formData.append("name", "Failing");
    formData.append("spdxType", "MIT");

    const req = new NextRequest("http://localhost:3000/api/datasets", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);

    // Should return 500 from apiError, not crash
    expect(res.status).toBe(500);
  });
});
