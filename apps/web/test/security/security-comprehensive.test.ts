import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────
const mockResolveAccessor = vi.fn();
const mockResolveAccessorStrict = vi.fn();
const mockUpload = vi.fn();
const mockListByOwner = vi.fn();
const mockCountByOwner = vi.fn();

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
      countByOwner: mockCountByOwner,
    },
  }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const { POST } = await import("@/app/api/datasets/route");

const OWNER = "0xOwner123";

function makeFormData(fields: Record<string, string | File>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

function makeRequest(body: FormData) {
  return new NextRequest("http://localhost:3000/api/datasets", {
    method: "POST",
    body,
  });
}

describe("Dataset Upload Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER });
    mockCountByOwner.mockResolvedValue(0);
  });

  it("rejects files with disallowed extensions", async () => {
    const file = new File(["malware"], "evil.exe", { type: "application/octet-stream" });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain("File type not allowed");
  });

  it("rejects .sh files", async () => {
    const file = new File(["#!/bin/bash"], "script.sh", { type: "application/x-shellscript" });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
  });

  it("allows .csv files", async () => {
    const file = new File(["col1,col2\na,b"], "data.csv", { type: "text/csv" });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    mockUpload.mockResolvedValue({ dataset: {}, license: {} });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(201);
  });

  it("allows .json files", async () => {
    const file = new File(['{"key":"value"}'], "data.json", { type: "application/json" });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    mockUpload.mockResolvedValue({ dataset: {}, license: {} });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(201);
  });

  it("rejects PE executable by magic bytes", async () => {
    // MZ header (PE executable)
    const mzHeader = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    const file = new File([mzHeader], "data.csv", { type: "text/csv" });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain("Executable");
  });

  it("rejects ELF binary by magic bytes", async () => {
    // ELF header
    const elfHeader = new Uint8Array([0x7f, 0x45, 0x4c, 0x46]);
    const file = new File([elfHeader], "data.csv", { type: "text/csv" });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
  });

  it("rejects files exceeding 50MB", async () => {
    const bigContent = new Uint8Array(51 * 1024 * 1024);
    const file = new File([bigContent], "huge.csv", { type: "text/csv" });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(413);
  });

  it("rejects unauthenticated requests", async () => {
    mockResolveAccessorStrict.mockResolvedValue(null);
    const file = new File(["data"], "test.csv", { type: "text/csv" });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(401);
  });

  it("enforces daily upload quota", async () => {
    mockCountByOwner.mockResolvedValue(50);
    const file = new File(["data"], "test.csv", { type: "text/csv" });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(429);
  });

  it("rejects missing required fields", async () => {
    const file = new File(["data"], "test.csv", { type: "text/csv" });
    const fd = makeFormData({ file } as never);
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });

  it("rejects empty file", async () => {
    const file = new File([], "empty.csv", { type: "text/csv" });
    const fd = makeFormData({ name: "test", spdxType: "MIT", file });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });
});
