import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies ---
const mockListAll = vi.fn();
const mockCount = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    access: {
      listAll: mockListAll,
      count: mockCount,
    },
  }),
}));

const mockValidateAuth = vi.fn();

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: vi.fn(),
    validateAuth: (...args: unknown[]) => mockValidateAuth(...args),
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

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { GET } from "../../src/app/api/access/route";

describe("GET /api/access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateAuth.mockResolvedValue(true);
  });

  it("should return 401 when not authed", async () => {
    mockValidateAuth.mockResolvedValue(false);
    const req = new NextRequest("http://localhost/api/access");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return access logs with pagination", async () => {
    const logs = [{ id: "log-1", datasetId: "ds-1" }];
    mockListAll.mockResolvedValue(logs);
    mockCount.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/access");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(logs);
    expect(body.pagination).toEqual({ total: 1, limit: 50, offset: 0 });
  });

  it("should pass filters to service", async () => {
    mockListAll.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const req = new NextRequest(
      "http://localhost/api/access?datasetId=550e8400-e29b-41d4-a716-446655440000&operationType=download&limit=10&offset=5"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockListAll).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetId: "550e8400-e29b-41d4-a716-446655440000",
        operationType: "download",
        limit: 10,
        offset: 5,
      })
    );
  });

  it("should return 400 for invalid limit (NaN)", async () => {
    const req = new NextRequest("http://localhost/api/access?limit=abc");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid query parameters");
  });

  it("should return 400 for negative offset", async () => {
    const req = new NextRequest("http://localhost/api/access?offset=-1");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid date", async () => {
    const req = new NextRequest("http://localhost/api/access?from=not-a-date");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid operationType", async () => {
    const req = new NextRequest("http://localhost/api/access?operationType=hack");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("should accept valid date range", async () => {
    mockListAll.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const req = new NextRequest(
      "http://localhost/api/access?from=2025-01-01T00:00:00Z&to=2025-12-31T23:59:59Z"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockListAll).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.any(Date),
        to: expect.any(Date),
      })
    );
  });
});
