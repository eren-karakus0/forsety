import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies before importing route ---

const mockLogAccess = vi.fn();
const mockGetAgentById = vi.fn();
const mockAuditLog = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    access: { logAccess: mockLogAccess },
    agents: { getById: mockGetAgentById },
    agentAudit: { log: mockAuditLog },
  }),
}));

const mockResolveAccessorStrict = vi.fn();

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessorStrict: (...args: unknown[]) => mockResolveAccessorStrict(...args),
    unauthorizedResponse: () => NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
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

import { POST } from "../../src/app/api/access/route";

const OWNER = "0xowner";

describe("POST /api/access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log access successfully", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockLogAccess.mockResolvedValue({ id: "log-1", operationType: "read" });

    const req = new NextRequest("http://localhost/api/access", {
      method: "POST",
      body: JSON.stringify({
        datasetId: "ds-1",
        operationType: "read",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("log-1");
    expect(mockLogAccess).toHaveBeenCalledWith({
      datasetId: "ds-1",
      accessorAddress: OWNER,
      operationType: "read",
    });
  });

  it("should return 400 for missing fields", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/access", {
      method: "POST",
      body: JSON.stringify({ datasetId: "ds-1" }), // missing operationType
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid operationType", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/access", {
      method: "POST",
      body: JSON.stringify({
        datasetId: "ds-1",
        operationType: "invalid",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 401 when not authenticated", async () => {
    mockResolveAccessorStrict.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/access", {
      method: "POST",
      body: JSON.stringify({
        datasetId: "ds-1",
        operationType: "read",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("should validate agentId ownership before audit log", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockLogAccess.mockResolvedValue({ id: "log-1", operationType: "read" });
    mockGetAgentById.mockResolvedValue({ id: "ag-1", ownerAddress: OWNER });
    mockAuditLog.mockResolvedValue({ id: "audit-1" });

    const req = new NextRequest("http://localhost/api/access", {
      method: "POST",
      body: JSON.stringify({
        datasetId: "ds-1",
        operationType: "read",
        agentId: "ag-1",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockGetAgentById).toHaveBeenCalledWith("ag-1");
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "ag-1",
        action: "dataset.access",
      })
    );
  });
});
