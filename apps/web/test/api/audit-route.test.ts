import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockListByOwner = vi.fn();
const mockResolveAccessor = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    agentAudit: { listByOwner: mockListByOwner },
  }),
}));

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: any[]) => mockResolveAccessor(...args),
    unauthorizedResponse: () =>
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
});

vi.mock("@/lib/api-error", () => ({
  apiError: (msg: string) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: msg }, { status: 500 });
  },
}));

const { GET } = await import("@/app/api/audit/route");

describe("GET /api/audit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when unauthenticated", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/audit");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return audit logs with default pagination", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner" });
    const logs = [{ id: "log-1", status: "success" }];
    mockListByOwner.mockResolvedValue(logs);

    const req = new NextRequest("http://localhost/api/audit");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.logs).toEqual(logs);
    expect(mockListByOwner).toHaveBeenCalledWith("0xowner", {
      agentId: undefined,
      status: undefined,
      limit: 100,
      offset: 0,
    });
  });

  it("should pass filter params to service", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner" });
    mockListByOwner.mockResolvedValue([]);

    const req = new NextRequest(
      "http://localhost/api/audit?agentId=agent-1&status=denied&limit=50&offset=10"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockListByOwner).toHaveBeenCalledWith("0xowner", {
      agentId: "agent-1",
      status: "denied",
      limit: 50,
      offset: 10,
    });
  });

  it("should clamp limit to 500 max", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner" });
    mockListByOwner.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/audit?limit=9999");
    await GET(req);

    expect(mockListByOwner).toHaveBeenCalledWith(
      "0xowner",
      expect.objectContaining({ limit: 500 })
    );
  });

  it("should convert anonymous agentId to null", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner" });
    mockListByOwner.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/audit?agentId=anonymous");
    await GET(req);

    expect(mockListByOwner).toHaveBeenCalledWith(
      "0xowner",
      expect.objectContaining({ agentId: null })
    );
  });
});
