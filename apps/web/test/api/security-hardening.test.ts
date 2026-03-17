import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock dependencies ─────────────────────────────────────
const mockDatasetGetById = vi.fn();
const mockDatasetArchive = vi.fn();
const mockDatasetGetWithLicense = vi.fn();
const mockDatasetListByOwner = vi.fn();
const mockEvidenceGetById = vi.fn();
const mockEvidenceGeneratePack = vi.fn();
const mockShareCreateShareLink = vi.fn();
const mockAuditListByOwner = vi.fn();
const mockAuditCountByOwner = vi.fn();
const mockAuditGetByAgent = vi.fn();
const mockPolicyGetById = vi.fn();
const mockPolicyCreate = vi.fn();
const mockAgentGetById = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    datasets: {
      getById: mockDatasetGetById,
      archive: mockDatasetArchive,
      getWithLicense: mockDatasetGetWithLicense,
      listByOwner: mockDatasetListByOwner,
    },
    evidence: {
      getById: mockEvidenceGetById,
      generatePack: mockEvidenceGeneratePack,
    },
    share: {
      createShareLink: mockShareCreateShareLink,
    },
    agentAudit: {
      listByOwner: mockAuditListByOwner,
      countByOwner: mockAuditCountByOwner,
      getByAgent: mockAuditGetByAgent,
    },
    policies: {
      getById: mockPolicyGetById,
      create: mockPolicyCreate,
    },
    agents: {
      getById: mockAgentGetById,
    },
    access: {
      getByDatasetId: vi.fn().mockResolvedValue([]),
    },
  }),
}));

const mockResolveAccessor = vi.fn();

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: unknown[]) => mockResolveAccessor(...args),
    resolveAccessorStrict: (...args: unknown[]) => mockResolveAccessor(...args),
    validateApiKey: vi.fn().mockReturnValue(false),
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

// Mock next/headers cookies for server actions
const mockCookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockCookiesGet(...args),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@forsety/auth", () => ({
  verifyJwt: vi.fn().mockResolvedValue({ sub: "0xother" }),
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ JWT_SECRET: "test-secret", FORSETY_API_KEY: "test-key" }),
}));

vi.mock("@forsety/sdk", () => ({
  sanitizeAgent: (a: Record<string, unknown>) => a,
}));

// ─── Import routes ─────────────────────────────────────
import { POST as evidenceRoutePost } from "../../src/app/api/datasets/[id]/evidence/route";
import { POST as shareRoutePost } from "../../src/app/api/evidence/[id]/share/route";
import { GET as auditRouteGet } from "../../src/app/api/audit/route";
import { GET as agentAuditRouteGet } from "../../src/app/api/agents/[id]/audit/route";

const OWNER = "0xowner";
const OTHER = "0xother";

const MOCK_DATASET = {
  id: "ds-1",
  name: "test",
  ownerAddress: OWNER,
  archivedAt: null,
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ─── POST /api/datasets/[id]/evidence — owner check ────────
describe("POST /api/datasets/[id]/evidence — IDOR fix", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/datasets/ds-1/evidence", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await evidenceRoutePost(req, makeParams("ds-1"));
    expect(res.status).toBe(401);
  });

  it("should return 403 when not owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OTHER, trusted: true });
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    const req = new NextRequest("http://localhost/api/datasets/ds-1/evidence", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await evidenceRoutePost(req, makeParams("ds-1"));
    expect(res.status).toBe(403);
  });

  it("should return 201 when owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    mockEvidenceGeneratePack.mockResolvedValue({ json: {}, hash: "abc123" });
    const req = new NextRequest("http://localhost/api/datasets/ds-1/evidence", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await evidenceRoutePost(req, makeParams("ds-1"));
    expect(res.status).toBe(201);
  });
});

// ─── POST /api/evidence/[id]/share — owner check ────────
describe("POST /api/evidence/[id]/share — IDOR fix", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/evidence/ep-1/share", {
      method: "POST",
      body: JSON.stringify({ mode: "full", ttlHours: 24 }),
    });
    const res = await shareRoutePost(req, makeParams("ep-1"));
    expect(res.status).toBe(401);
  });

  it("should return 403 when not owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OTHER, trusted: true });
    mockEvidenceGetById.mockResolvedValue({ id: "ep-1", datasetId: "ds-1" });
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    const req = new NextRequest("http://localhost/api/evidence/ep-1/share", {
      method: "POST",
      body: JSON.stringify({ mode: "full", ttlHours: 24 }),
    });
    const res = await shareRoutePost(req, makeParams("ep-1"));
    expect(res.status).toBe(403);
  });

  it("should return 201 when owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockEvidenceGetById.mockResolvedValue({ id: "ep-1", datasetId: "ds-1" });
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);
    mockShareCreateShareLink.mockResolvedValue({
      token: "tok123",
      mode: "full",
      expiresAt: new Date(),
    });
    const req = new NextRequest("http://localhost/api/evidence/ep-1/share", {
      method: "POST",
      body: JSON.stringify({ mode: "full", ttlHours: 24 }),
    });
    const res = await shareRoutePost(req, makeParams("ep-1"));
    expect(res.status).toBe(201);
  });
});

// ─── GET /api/audit — input validation ────────
describe("GET /api/audit — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockAuditListByOwner.mockResolvedValue([]);
  });

  it("should clamp NaN limit to default", async () => {
    const req = new NextRequest("http://localhost/api/audit?limit=abc");
    await auditRouteGet(req);
    expect(mockAuditListByOwner).toHaveBeenCalled();
    const callArgs = mockAuditListByOwner.mock.calls[0];
    expect(callArgs[1].limit).toBeLessThanOrEqual(500);
    expect(callArgs[1].limit).toBeGreaterThanOrEqual(1);
  });

  it("should clamp overflow limit to 500", async () => {
    const req = new NextRequest("http://localhost/api/audit?limit=999999");
    await auditRouteGet(req);
    const callArgs = mockAuditListByOwner.mock.calls[0];
    expect(callArgs[1].limit).toBe(500);
  });

  it("should clamp negative offset to 0", async () => {
    const req = new NextRequest("http://localhost/api/audit?offset=-5");
    await auditRouteGet(req);
    const callArgs = mockAuditListByOwner.mock.calls[0];
    expect(callArgs[1].offset).toBe(0);
  });
});

// ─── GET /api/agents/[id]/audit — input validation ────────
describe("GET /api/agents/[id]/audit — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockAgentGetById.mockResolvedValue({ id: "agent-1", ownerAddress: OWNER });
    mockAuditGetByAgent.mockResolvedValue([]);
  });

  it("should clamp overflow limit to 500", async () => {
    const req = new NextRequest("http://localhost/api/agents/agent-1/audit?limit=999999");
    await agentAuditRouteGet(req, makeParams("agent-1"));
    const callArgs = mockAuditGetByAgent.mock.calls[0];
    expect(callArgs[1].limit).toBe(500);
  });
});
