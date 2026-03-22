import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRegister = vi.fn();
const mockListByOwner = vi.fn();
const mockSanitizeAgent = vi.fn((a: any) => ({ id: a.id, name: a.name }));

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    agents: { register: mockRegister, listByOwner: mockListByOwner },
  }),
}));

vi.mock("@forsety/sdk", () => ({
  sanitizeAgent: (a: any) => mockSanitizeAgent(a),
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

import { GET, POST } from "../../src/app/api/agents/route";

const OWNER = "0xaaa111bbb222ccc333";

describe("GET /api/agents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return agents for authenticated user", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockListByOwner.mockResolvedValue([{ id: "a1", name: "Bot" }]);

    const req = new NextRequest("http://localhost/api/agents");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agents).toHaveLength(1);
  });

  it("should return 401 when not authenticated", async () => {
    mockResolveAccessor.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/agents");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/agents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should register agent for authenticated user", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockRegister.mockResolvedValue({
      agent: { id: "a1", name: "Bot" },
      apiKey: "fsy_test123",
    });

    const req = new NextRequest("http://localhost/api/agents", {
      method: "POST",
      body: JSON.stringify({ name: "Bot", permissions: ["read"] }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.apiKey).toBe("fsy_test123");
    expect(body.warning).toContain("Store this API key");
  });

  it("should return 400 when name is missing", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });

    const req = new NextRequest("http://localhost/api/agents", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 401 when not authenticated", async () => {
    mockResolveAccessorStrict.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/agents", {
      method: "POST",
      body: JSON.stringify({ name: "Bot" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("should use auth accessor as ownerAddress", async () => {
    mockResolveAccessorStrict.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockRegister.mockResolvedValue({
      agent: { id: "a2", name: "Bot2" },
      apiKey: "fsy_xxx",
    });

    const req = new NextRequest("http://localhost/api/agents", {
      method: "POST",
      body: JSON.stringify({ name: "Bot2" }),
    });
    await POST(req);

    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ ownerAddress: OWNER })
    );
  });
});
