import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────
const mockResolveAccessor = vi.fn();
const mockResolveAccessorStrict = vi.fn();
const mockUpload = vi.fn();
const mockListByOwner = vi.fn();
const mockCountByOwnerSince = vi.fn();

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: unknown[]) => mockResolveAccessor(...args),
    resolveAccessorStrict: (...args: unknown[]) => mockResolveAccessorStrict(...args),
    unauthorizedResponse: () => NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
});

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    datasets: {
      upload: mockUpload,
      listByOwner: mockListByOwner,
      countByOwnerSince: mockCountByOwnerSince,
    },
  }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const { POST } = await import("@/app/api/datasets/route");

const OWNER = "0xOwner123";

/** Create a File-like object with a working arrayBuffer() method.
 *  Vitest jsdom does not implement Blob/File.arrayBuffer() — polyfill with Buffer. */
function makeFile(parts: (string | Uint8Array)[], name: string, type: string): File {
  const buffers = parts.map((p) =>
    typeof p === "string" ? Buffer.from(p) : Buffer.from(p)
  );
  const combined = Buffer.concat(buffers);
  const file = new File([combined], name, { type });
  // Polyfill arrayBuffer() for jsdom
  file.arrayBuffer = () => Promise.resolve(combined.buffer.slice(combined.byteOffset, combined.byteOffset + combined.byteLength));
  return file;
}

function makeFormData(fields: Record<string, string | File>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

function makeRequest(body: FormData) {
  const req = new NextRequest("http://localhost:3000/api/datasets", {
    method: "POST",
  });
  // Override formData() — Vitest + NextRequest FormData body hangs
  req.formData = async () => body;
  return req;
}

describe("Dataset Upload Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER });
    mockCountByOwnerSince.mockResolvedValue(0);
  });

  it("rejects files with disallowed extensions", async () => {
    const file = makeFile(["malware"], "evil.exe", "application/octet-stream");
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain("File type not allowed");
  });

  it("rejects .sh files", async () => {
    const file = makeFile(["#!/bin/bash"], "script.sh", "application/x-shellscript");
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
  });

  it("allows .csv files", async () => {
    const file = makeFile(["col1,col2\na,b"], "data.csv", "text/csv");
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    mockUpload.mockResolvedValue({ dataset: {}, license: {} });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(201);
  });

  it("allows .json files", async () => {
    const file = makeFile(['{"key":"value"}'], "data.json", "application/json");
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    mockUpload.mockResolvedValue({ dataset: {}, license: {} });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(201);
  });

  it("rejects PE executable by magic bytes", async () => {
    // MZ header (PE executable)
    const mzHeader = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    const file = makeFile([mzHeader], "data.csv", "text/csv");
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain("Executable");
  });

  it("rejects ELF binary by magic bytes", async () => {
    // ELF header
    const elfHeader = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
    const file = makeFile([elfHeader], "data.csv", "text/csv");
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
  });

  it("rejects files exceeding 50MB", async () => {
    // Create a File that reports size > 50MB without allocating real memory
    const smallContent = new Uint8Array(1024);
    const file = makeFile([smallContent], "huge.csv", "text/csv");
    Object.defineProperty(file, "size", { value: 51 * 1024 * 1024 });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(413);
  });

  it("rejects unauthenticated requests", async () => {
    mockResolveAccessorStrict.mockResolvedValue(null);
    const file = makeFile(["data"], "test.csv", "text/csv");
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(401);
  });

  it("enforces daily upload quota", async () => {
    mockCountByOwnerSince.mockResolvedValue(50);
    const file = makeFile(["data"], "test.csv", "text/csv");
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("Daily upload limit");
  });

  it("rejects missing required fields", async () => {
    const file = makeFile(["data"], "test.csv", "text/csv");
    const fd = makeFormData({ file } as never);
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });

  it("rejects empty file", async () => {
    const file = makeFile([], "empty.csv", "text/csv");
    Object.defineProperty(file, "size", { value: 0 });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });
});
