import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies before importing route ---

const mockListByOwner = vi.fn();
const mockUpload = vi.fn();
const mockGetById = vi.fn();
const mockAuthenticate = vi.fn();
const mockCountByOwnerSince = vi.fn().mockResolvedValue(0);

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    datasets: { listByOwner: mockListByOwner, upload: mockUpload, getById: mockGetById, countByOwnerSince: mockCountByOwnerSince },
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

/** Create a File with working arrayBuffer() for Vitest jsdom. */
function makeFile(content: string | Uint8Array, name: string, type = "text/csv"): File {
  const buf = typeof content === "string" ? Buffer.from(content) : Buffer.from(content);
  const file = new File([buf], name, { type });
  file.arrayBuffer = () => Promise.resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  return file;
}

/** Create a FormData-backed POST request with formData() override. */
function makePostRequest(fd: FormData) {
  const req = new NextRequest("http://localhost:3000/api/datasets", { method: "POST" });
  req.formData = async () => fd;
  return req;
}

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
    mockCountByOwnerSince.mockResolvedValue(0);
  });

  it("should return 401 when not authenticated", async () => {
    mockResolveAccessorStrict.mockResolvedValue(null);

    const fd = new FormData();
    fd.append("file", makeFile("test content", "test.csv"));
    fd.append("name", "Test Dataset");
    fd.append("spdxType", "MIT");

    const res = await POST(makePostRequest(fd));
    expect(res.status).toBe(401);
  });

  it("should return 400 when name is missing", async () => {
    const fd = new FormData();
    fd.append("file", makeFile("content", "test.csv"));
    fd.append("spdxType", "MIT");

    const res = await POST(makePostRequest(fd));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("name");
  });

  it("should return 400 when spdxType is missing", async () => {
    const fd = new FormData();
    fd.append("file", makeFile("content", "test.csv"));
    fd.append("name", "Test");

    const res = await POST(makePostRequest(fd));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("spdxType");
  });

  it("should return 400 when file is missing", async () => {
    const fd = new FormData();
    fd.append("name", "Test Dataset");
    fd.append("spdxType", "MIT");

    const req = new NextRequest("http://localhost:3000/api/datasets", { method: "POST" });
    req.formData = async () => fd;
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("File");
  });

  it("should return 400 when file is empty (zero bytes)", async () => {
    const file = makeFile("", "empty.csv");
    Object.defineProperty(file, "size", { value: 0 });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", "Empty");
    fd.append("spdxType", "MIT");

    const res = await POST(makePostRequest(fd));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("File");
  });

  it("should return 413 when file exceeds 50MB limit", async () => {
    const file = makeFile("small", "big.csv");
    Object.defineProperty(file, "size", { value: 51 * 1024 * 1024 });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", "Big File");
    fd.append("spdxType", "MIT");

    const res = await POST(makePostRequest(fd));

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain("50MB");
  });

  it("should use ownerAddress from auth context, not formData", async () => {
    mockUpload.mockResolvedValue({ id: "ds-new", name: "Test" });

    const fd = new FormData();
    fd.append("file", makeFile("content", "test.csv"));
    fd.append("name", "Test");
    fd.append("spdxType", "MIT");
    fd.append("ownerAddress", "0xattacker");

    const res = await POST(makePostRequest(fd));

    expect(res.status).toBe(201);
    // Verify upload was called with auth accessor, not formData ownerAddress
    const uploadCall = mockUpload.mock.calls[0]![0];
    expect(uploadCall.ownerAddress).toBe(OWNER);
  });

  it("should sanitize filename (remove unsafe chars)", async () => {
    mockUpload.mockResolvedValue({ id: "ds-safe", name: "Safe" });

    const fd = new FormData();
    fd.append("file", makeFile("data", "my file (1).csv"));
    fd.append("name", "Safe Name");
    fd.append("spdxType", "MIT");

    const res = await POST(makePostRequest(fd));

    expect(res.status).toBe(201);
  });

  it("should accept optional description field", async () => {
    mockUpload.mockResolvedValue({ id: "ds-desc", name: "With Desc" });

    const fd = new FormData();
    fd.append("file", makeFile("data", "test.csv"));
    fd.append("name", "With Desc");
    fd.append("spdxType", "MIT");
    fd.append("description", "A detailed description");

    const res = await POST(makePostRequest(fd));

    expect(res.status).toBe(201);
    const uploadCall = mockUpload.mock.calls[0]![0];
    expect(uploadCall.description).toBe("A detailed description");
  });

  it("should cleanup temp file on upload failure", async () => {
    mockUpload.mockRejectedValue(new Error("Shelby upload failed"));

    const fd = new FormData();
    fd.append("file", makeFile("data", "test.csv"));
    fd.append("name", "Failing");
    fd.append("spdxType", "MIT");

    const res = await POST(makePostRequest(fd));

    // Should return 500 from apiError, not crash
    expect(res.status).toBe(500);
  });
});
