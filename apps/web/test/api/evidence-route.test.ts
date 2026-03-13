import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock dependencies ─────────────────────────────────────
const mockEvidenceListByOwner = vi.fn();
const mockEvidenceGetById = vi.fn();
const mockDatasetGetById = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    evidence: {
      listByOwner: mockEvidenceListByOwner,
      getById: mockEvidenceGetById,
    },
    datasets: {
      getById: mockDatasetGetById,
    },
  }),
}));

const mockResolveAccessor = vi.fn();

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: any[]) => mockResolveAccessor(...args),
    unauthorizedResponse: () =>
      NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing API key" },
        { status: 401 }
      ),
  };
});

vi.mock("@/lib/api-error", () => ({
  apiError: (msg: string, err: unknown) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: msg }, { status: 500 });
  },
}));

describe("Evidence Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/evidence", () => {
    it("should return 401 when unauthenticated", async () => {
      mockResolveAccessor.mockResolvedValue(null);

      const { GET } = await import("../../src/app/api/evidence/route");
      const req = new NextRequest("http://localhost:3000/api/evidence");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("should return owner-scoped evidence packs", async () => {
      mockResolveAccessor.mockResolvedValue({ accessor: "0xowner1", trusted: true });
      mockEvidenceListByOwner.mockResolvedValue([
        { id: "pack-1", datasetId: "ds-1", packHash: "hash1" },
        { id: "pack-2", datasetId: "ds-2", packHash: "hash2" },
      ]);

      const { GET } = await import("../../src/app/api/evidence/route");
      const req = new NextRequest("http://localhost:3000/api/evidence");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toHaveLength(2);
      expect(mockEvidenceListByOwner).toHaveBeenCalledWith("0xowner1", expect.any(Object));
    });

    it("should respect limit and offset params", async () => {
      mockResolveAccessor.mockResolvedValue({ accessor: "0xowner1", trusted: true });
      mockEvidenceListByOwner.mockResolvedValue([]);

      const { GET } = await import("../../src/app/api/evidence/route");
      const req = new NextRequest("http://localhost:3000/api/evidence?limit=10&offset=20");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(mockEvidenceListByOwner).toHaveBeenCalledWith("0xowner1", { limit: 10, offset: 20 });
    });
  });

  describe("GET /api/evidence/[id]", () => {
    it("should return 401 when unauthenticated", async () => {
      mockResolveAccessor.mockResolvedValue(null);

      const { GET } = await import("../../src/app/api/evidence/[id]/route");
      const req = new NextRequest("http://localhost:3000/api/evidence/pack-1");
      const res = await GET(req, { params: Promise.resolve({ id: "pack-1" }) });

      expect(res.status).toBe(401);
    });

    it("should return 404 when evidence pack not found", async () => {
      mockResolveAccessor.mockResolvedValue({ accessor: "0xowner1", trusted: true });
      mockEvidenceGetById.mockResolvedValue(null);

      const { GET } = await import("../../src/app/api/evidence/[id]/route");
      const req = new NextRequest("http://localhost:3000/api/evidence/nonexistent");
      const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });

      expect(res.status).toBe(404);
    });

    it("should return 403 when not owner", async () => {
      mockResolveAccessor.mockResolvedValue({ accessor: "0xnotowner", trusted: true });
      mockEvidenceGetById.mockResolvedValue({ id: "pack-1", datasetId: "ds-1" });
      mockDatasetGetById.mockResolvedValue({ id: "ds-1", ownerAddress: "0xowner1" });

      const { GET } = await import("../../src/app/api/evidence/[id]/route");
      const req = new NextRequest("http://localhost:3000/api/evidence/pack-1");
      const res = await GET(req, { params: Promise.resolve({ id: "pack-1" }) });

      expect(res.status).toBe(403);
    });

    it("should return evidence pack for valid owner", async () => {
      const mockPack = { id: "pack-1", datasetId: "ds-1", packHash: "hash1" };
      mockResolveAccessor.mockResolvedValue({ accessor: "0xowner1", trusted: true });
      mockEvidenceGetById.mockResolvedValue(mockPack);
      mockDatasetGetById.mockResolvedValue({ id: "ds-1", ownerAddress: "0xowner1" });

      const { GET } = await import("../../src/app/api/evidence/[id]/route");
      const req = new NextRequest("http://localhost:3000/api/evidence/pack-1");
      const res = await GET(req, { params: Promise.resolve({ id: "pack-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toEqual(mockPack);
    });
  });
});
