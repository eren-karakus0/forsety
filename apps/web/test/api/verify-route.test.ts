import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockResolveShareLink = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    share: { resolveShareLink: mockResolveShareLink },
  }),
}));

vi.mock("@/lib/api-error", () => ({
  apiError: (msg: string) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: msg }, { status: 500 });
  },
}));

const { GET } = await import("@/app/api/verify/[token]/route");

describe("GET /api/verify/[token]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return pack data for valid token", async () => {
    const now = new Date();
    mockResolveShareLink.mockResolvedValue({
      link: { mode: "view", expiresAt: now },
      pack: {
        packJson: { id: "pack-1" },
        packJsonCanonical: '{"id":"pack-1"}',
        packHash: "abc123",
        generatedAt: now,
      },
    });

    const req = new NextRequest("http://localhost/api/verify/valid-token");
    const res = await GET(req, { params: Promise.resolve({ token: "valid-token" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.mode).toBe("view");
    expect(body.pack.packHash).toBe("abc123");
  });

  it("should return 404 for expired/invalid token", async () => {
    mockResolveShareLink.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/verify/bad-token");
    const res = await GET(req, { params: Promise.resolve({ token: "bad-token" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toContain("expired");
  });

  it("should return 500 on service error", async () => {
    mockResolveShareLink.mockRejectedValue(new Error("db error"));

    const req = new NextRequest("http://localhost/api/verify/err-token");
    const res = await GET(req, { params: Promise.resolve({ token: "err-token" }) });

    expect(res.status).toBe(500);
  });
});
