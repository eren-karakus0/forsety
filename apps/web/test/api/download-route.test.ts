import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies before importing route ---

const mockGetById = vi.fn();
const mockCheckAccess = vi.fn();
const mockLogAccess = vi.fn();
const mockDownloadDataset = vi.fn();
const mockAuthenticate = vi.fn();
const mockNotificationsCreate = vi.fn().mockResolvedValue({});

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    datasets: { getById: mockGetById },
    policies: { checkAccess: mockCheckAccess },
    access: { logAccess: mockLogAccess },
    agents: { authenticate: mockAuthenticate },
    notifications: { create: (...args: unknown[]) => mockNotificationsCreate(...args) },
    getShelby: () => ({ downloadDataset: mockDownloadDataset }),
  }),
}));

const mockResolveAccessor = vi.fn();
const mockCheckAgentScope = vi.fn().mockReturnValue({ allowed: true });

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: unknown[]) => mockResolveAccessor(...args),
    checkAgentScope: (...args: unknown[]) => mockCheckAgentScope(...args),
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

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock ForsetyAuthError to be catchable
const { ForsetyAuthError } = await import("@forsety/sdk");

import { GET, HEAD } from "../../src/app/api/datasets/[id]/download/route";

function makeRequest(method: string = "GET") {
  return new NextRequest("http://localhost:3000/api/datasets/ds-1/download", { method });
}

function makeParams(id: string = "ds-1") {
  return { params: Promise.resolve({ id }) };
}

const MOCK_DATASET = {
  id: "ds-1",
  name: "test-dataset.csv",
  shelbyBlobName: "files/test-dataset.csv",
  blobHash: "sha256:abc123",
  sizeBytes: 100,
  ownerAddress: "0xowner",
};

describe("GET /api/datasets/[id]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: JWT auth succeeds (trusted)
    mockResolveAccessor.mockResolvedValue({ accessor: "0xuser-wallet", trusted: true });
    // Default: agent scope check passes
    mockCheckAgentScope.mockReturnValue({ allowed: true });
  });

  it("should return 401 when no auth is provided", async () => {
    mockResolveAccessor.mockResolvedValue(null);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(401);
  });

  it("should return 404 when dataset does not exist", async () => {
    mockGetById.mockResolvedValue(null);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });

  it("should return 404 when dataset has no shelbyBlobName", async () => {
    mockGetById.mockResolvedValue({ ...MOCK_DATASET, shelbyBlobName: null });

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
  });

  it("should return 403 when policy denies access", async () => {
    mockGetById.mockResolvedValue(MOCK_DATASET);
    mockCheckAccess.mockResolvedValue({ allowed: false, policy: null });

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Access denied");
  });

  it("should return 403 when logAccess throws ForsetyAuthError", async () => {
    mockGetById.mockResolvedValue(MOCK_DATASET);
    mockCheckAccess.mockResolvedValue({ allowed: true, policy: { id: "p1" } });
    // downloadDataset writes a temp file — mock it
    mockDownloadDataset.mockImplementation((_blob: string, path: string) => {
      const { writeFileSync } = require("node:fs");
      writeFileSync(path, "test content");
    });
    // logAccess throws on its internal re-check
    mockLogAccess.mockRejectedValue(new ForsetyAuthError("Policy changed"));

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(403);
  });

  it("should not call logAccess when download fails", async () => {
    mockGetById.mockResolvedValue(MOCK_DATASET);
    mockCheckAccess.mockResolvedValue({ allowed: true, policy: { id: "p1" } });
    mockDownloadDataset.mockRejectedValue(new Error("Shelby 503"));

    const res = await GET(makeRequest(), makeParams());

    // Download failed → 500 from apiError
    expect(res.status).toBe(500);
    // logAccess must NOT have been called
    expect(mockLogAccess).not.toHaveBeenCalled();
  });

  it("should stream file and set correct headers on success", async () => {
    mockGetById.mockResolvedValue(MOCK_DATASET);
    mockCheckAccess.mockResolvedValue({ allowed: true, policy: { id: "p1" } });
    mockDownloadDataset.mockImplementation((_blob: string, path: string) => {
      const { writeFileSync } = require("node:fs");
      writeFileSync(path, "file-content-here");
    });
    mockLogAccess.mockResolvedValue({ id: "log-42", operationType: "download" });

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(res.headers.get("Content-Disposition")).toContain("test-dataset.csv");
    expect(res.headers.get("X-Blob-Hash")).toBe("sha256:abc123");
    expect(res.headers.get("X-Access-Log-Id")).toBe("log-42");
    expect(res.headers.get("Content-Length")).toBe(String("file-content-here".length));
  });

  it("should call logAccess with correct operationType after successful download", async () => {
    mockGetById.mockResolvedValue(MOCK_DATASET);
    mockCheckAccess.mockResolvedValue({ allowed: true, policy: { id: "p1" } });
    mockDownloadDataset.mockImplementation((_blob: string, path: string) => {
      const { writeFileSync } = require("node:fs");
      writeFileSync(path, "content");
    });
    mockLogAccess.mockResolvedValue({ id: "log-1", operationType: "download" });

    await GET(makeRequest(), makeParams());

    expect(mockLogAccess).toHaveBeenCalledWith({
      datasetId: "ds-1",
      accessorAddress: "0xuser-wallet",
      operationType: "download",
    });
  });

  it("should resolve accessor from agent API key (fsy_ prefix)", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xagent-owner", trusted: true });
    mockGetById.mockResolvedValue(MOCK_DATASET);
    mockCheckAccess.mockResolvedValue({ allowed: true, policy: { id: "p1" } });
    mockDownloadDataset.mockImplementation((_blob: string, path: string) => {
      const { writeFileSync } = require("node:fs");
      writeFileSync(path, "agent-content");
    });
    mockLogAccess.mockResolvedValue({ id: "log-agent", operationType: "download" });

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    expect(mockLogAccess).toHaveBeenCalledWith(
      expect.objectContaining({ accessorAddress: "0xagent-owner" })
    );
  });

  it("should return 413 when dataset sizeBytes exceeds limit (pre-check)", async () => {
    // Route checks dataset.sizeBytes BEFORE downloading to avoid wasted bandwidth
    mockGetById.mockResolvedValue({
      ...MOCK_DATASET,
      sizeBytes: 200 * 1024 * 1024, // 200 MB > 100 MB limit
    });
    mockCheckAccess.mockResolvedValue({ allowed: true, policy: { id: "p1" } });

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain("100 MB");
    // Download must NOT have been attempted
    expect(mockDownloadDataset).not.toHaveBeenCalled();
  });

  it("should reject untrusted accessor from global API key", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xparam-addr", trusted: false });

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(401);
    expect(mockGetById).not.toHaveBeenCalled();
  });
});

describe("HEAD /api/datasets/[id]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: "0xuser-wallet", trusted: true });
    mockCheckAgentScope.mockReturnValue({ allowed: true });
  });

  it("should return 200 when auth + policy pass", async () => {
    mockGetById.mockResolvedValue(MOCK_DATASET);
    mockCheckAccess.mockResolvedValue({ allowed: true, policy: { id: "p1" } });

    const res = await HEAD(makeRequest("HEAD"), makeParams());

    expect(res.status).toBe(200);
    // HEAD must not trigger download or logAccess
    expect(mockDownloadDataset).not.toHaveBeenCalled();
    expect(mockLogAccess).not.toHaveBeenCalled();
  });

  it("should return 403 when policy denies", async () => {
    mockGetById.mockResolvedValue(MOCK_DATASET);
    mockCheckAccess.mockResolvedValue({ allowed: false, policy: null });

    const res = await HEAD(makeRequest("HEAD"), makeParams());

    expect(res.status).toBe(403);
  });

  it("should return 404 when dataset not found", async () => {
    mockGetById.mockResolvedValue(null);

    const res = await HEAD(makeRequest("HEAD"), makeParams());

    expect(res.status).toBe(404);
  });
});
