import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock dependencies ─────────────────────────────────────
const mockDatasetList = vi.fn();
const mockDatasetListByOwner = vi.fn();
const mockDatasetGetById = vi.fn();
const mockDatasetGetWithLicense = vi.fn();
const mockLicenseListByOwner = vi.fn();
const mockAccessListByOwner = vi.fn();
const mockAccessCountByOwner = vi.fn();
const mockAgentListByOwner = vi.fn();
const mockAgentGetById = vi.fn();
const mockAuditListByOwner = vi.fn();
const mockAuditGetByAgent = vi.fn();
const mockAuditGetSummary = vi.fn();
const mockPolicyListByOwner = vi.fn();
const mockPolicyGetByDatasetId = vi.fn();
const mockPolicyGetById = vi.fn();
const mockEvidenceListByOwner = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    datasets: {
      list: mockDatasetList,
      listByOwner: mockDatasetListByOwner,
      getById: mockDatasetGetById,
      getWithLicense: mockDatasetGetWithLicense,
    },
    licenses: {
      listByOwner: mockLicenseListByOwner,
    },
    access: {
      listByOwner: mockAccessListByOwner,
      countByOwner: mockAccessCountByOwner,
    },
    agents: {
      listByOwner: mockAgentListByOwner,
      getById: mockAgentGetById,
    },
    agentAudit: {
      listByOwner: mockAuditListByOwner,
      getByAgent: mockAuditGetByAgent,
      getSummary: mockAuditGetSummary,
    },
    policies: {
      listByOwner: mockPolicyListByOwner,
      getByDatasetId: mockPolicyGetByDatasetId,
      getById: mockPolicyGetById,
    },
    evidence: {
      listByOwner: mockEvidenceListByOwner,
    },
  }),
}));

const mockResolveAccessor = vi.fn();

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: unknown[]) => mockResolveAccessor(...args),
    validateApiKey: vi.fn().mockReturnValue(false),
    validateAuth: vi.fn().mockResolvedValue(false),
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
vi.mock("@forsety/sdk", () => ({
  sanitizeAgent: (a: any) => {
    const { agentApiKey: _, ...safe } = a;
    return safe;
  },
}));

// ─── Import route handlers ─────────────────────────────────
import { GET as DatasetsGET } from "../../src/app/api/datasets/route";
import { GET as DatasetByIdGET } from "../../src/app/api/datasets/[id]/route";
import { GET as LicensesGET } from "../../src/app/api/licenses/route";
import { GET as AccessGET } from "../../src/app/api/access/route";
import { GET as AgentsGET } from "../../src/app/api/agents/route";
import { GET as AgentByIdGET } from "../../src/app/api/agents/[id]/route";
import { GET as AgentAuditGET } from "../../src/app/api/agents/[id]/audit/route";
import { GET as AuditGET } from "../../src/app/api/audit/route";
import { GET as PoliciesGET } from "../../src/app/api/policies/route";
import { GET as PolicyByIdGET } from "../../src/app/api/policies/[id]/route";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const OWNER = "0xowner";
const STRANGER = "0xstranger";

// ─── GET /api/datasets ──────────────────────────────────────
describe("GET /api/datasets — tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/datasets");
    const res = await DatasetsGET(req);
    expect(res.status).toBe(401);
  });

  it("should return owner-scoped datasets", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockDatasetListByOwner.mockResolvedValue([{ id: "d1", name: "Mine" }]);
    const req = new NextRequest("http://localhost/api/datasets");
    const res = await DatasetsGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.datasets).toHaveLength(1);
    expect(mockDatasetListByOwner).toHaveBeenCalledWith(OWNER);
  });

  it("should return empty for owner with no datasets", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: STRANGER, trusted: true });
    mockDatasetListByOwner.mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/datasets");
    const res = await DatasetsGET(req);
    const body = await res.json();
    expect(body.datasets).toHaveLength(0);
  });
});

// ─── GET /api/datasets/[id] ────────────────────────────────
describe("GET /api/datasets/[id] — tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/datasets/d1");
    const res = await DatasetByIdGET(req, makeParams("d1"));
    expect(res.status).toBe(401);
  });

  it("should return 403 when not owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: STRANGER, trusted: true });
    mockDatasetGetWithLicense.mockResolvedValue({
      dataset: { id: "d1", ownerAddress: OWNER },
      licenses: [],
    });
    const req = new NextRequest("http://localhost/api/datasets/d1");
    const res = await DatasetByIdGET(req, makeParams("d1"));
    expect(res.status).toBe(403);
  });

  it("should return dataset when owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockDatasetGetWithLicense.mockResolvedValue({
      dataset: { id: "d1", ownerAddress: OWNER },
      licenses: [],
    });
    const req = new NextRequest("http://localhost/api/datasets/d1");
    const res = await DatasetByIdGET(req, makeParams("d1"));
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/licenses ──────────────────────────────────────
describe("GET /api/licenses — tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/licenses");
    const res = await LicensesGET(req);
    expect(res.status).toBe(401);
  });

  it("should call listByOwner with accessor", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockLicenseListByOwner.mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/licenses");
    const res = await LicensesGET(req);
    expect(res.status).toBe(200);
    expect(mockLicenseListByOwner).toHaveBeenCalledWith(OWNER, expect.any(Object));
  });
});

// ─── GET /api/access ────────────────────────────────────────
describe("GET /api/access — tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/access");
    const res = await AccessGET(req);
    expect(res.status).toBe(401);
  });

  it("should use listByOwner and countByOwner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockAccessListByOwner.mockResolvedValue([{ id: "a1" }]);
    mockAccessCountByOwner.mockResolvedValue(1);
    const req = new NextRequest("http://localhost/api/access");
    const res = await AccessGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination.total).toBe(1);
    expect(mockAccessListByOwner).toHaveBeenCalledWith(OWNER, expect.any(Object));
  });
});

// ─── GET /api/agents ────────────────────────────────────────
describe("GET /api/agents — tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/agents");
    const res = await AgentsGET(req);
    expect(res.status).toBe(401);
  });

  it("should call listByOwner with accessor", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockAgentListByOwner.mockResolvedValue([{ id: "ag1", name: "Bot", ownerAddress: OWNER }]);
    const req = new NextRequest("http://localhost/api/agents");
    const res = await AgentsGET(req);
    expect(res.status).toBe(200);
    expect(mockAgentListByOwner).toHaveBeenCalledWith(OWNER);
  });
});

// ─── GET /api/agents/[id] ──────────────────────────────────
describe("GET /api/agents/[id] — tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/agents/ag1");
    const res = await AgentByIdGET(req, makeParams("ag1"));
    expect(res.status).toBe(401);
  });

  it("should return 403 when not owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: STRANGER, trusted: true });
    mockAgentGetById.mockResolvedValue({ id: "ag1", ownerAddress: OWNER });
    const req = new NextRequest("http://localhost/api/agents/ag1");
    const res = await AgentByIdGET(req, makeParams("ag1"));
    expect(res.status).toBe(403);
  });

  it("should return agent when owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockAgentGetById.mockResolvedValue({ id: "ag1", ownerAddress: OWNER, isActive: true });
    mockAuditGetSummary.mockResolvedValue({
      totalActions: 0, successCount: 0, deniedCount: 0, errorCount: 0, recentActions: [],
    });
    const req = new NextRequest("http://localhost/api/agents/ag1");
    const res = await AgentByIdGET(req, makeParams("ag1"));
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/agents/[id]/audit ─────────────────────────────
describe("GET /api/agents/[id]/audit — tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/agents/ag1/audit");
    const res = await AgentAuditGET(req, makeParams("ag1"));
    expect(res.status).toBe(401);
  });

  it("should return 403 when not owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: STRANGER, trusted: true });
    mockAgentGetById.mockResolvedValue({ id: "ag1", ownerAddress: OWNER });
    const req = new NextRequest("http://localhost/api/agents/ag1/audit");
    const res = await AgentAuditGET(req, makeParams("ag1"));
    expect(res.status).toBe(403);
  });

  it("should return audit logs when owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockAgentGetById.mockResolvedValue({ id: "ag1", ownerAddress: OWNER });
    mockAuditGetByAgent.mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/agents/ag1/audit");
    const res = await AgentAuditGET(req, makeParams("ag1"));
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/audit ─────────────────────────────────────────
describe("GET /api/audit — tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/audit");
    const res = await AuditGET(req);
    expect(res.status).toBe(401);
  });

  it("should call listByOwner with accessor", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockAuditListByOwner.mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/audit");
    const res = await AuditGET(req);
    expect(res.status).toBe(200);
    expect(mockAuditListByOwner).toHaveBeenCalledWith(OWNER, expect.any(Object));
  });
});

// ─── GET /api/policies ──────────────────────────────────────
describe("GET /api/policies — tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/policies?datasetId=d1");
    const res = await PoliciesGET(req);
    expect(res.status).toBe(401);
  });

  it("should return policies for owner's dataset", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockDatasetGetById.mockResolvedValue({ id: "d1", ownerAddress: OWNER });
    mockPolicyGetByDatasetId.mockResolvedValue([{ id: "p1" }]);
    const req = new NextRequest("http://localhost/api/policies?datasetId=d1");
    const res = await PoliciesGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.policies).toHaveLength(1);
  });

  it("should return empty for non-owner's dataset", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: STRANGER, trusted: true });
    mockDatasetGetById.mockResolvedValue({ id: "d1", ownerAddress: OWNER });
    const req = new NextRequest("http://localhost/api/policies?datasetId=d1");
    const res = await PoliciesGET(req);
    const body = await res.json();
    expect(body.policies).toHaveLength(0);
  });

  it("should list all owner policies when no datasetId", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockPolicyListByOwner.mockResolvedValue([{ id: "p1" }]);
    const req = new NextRequest("http://localhost/api/policies");
    const res = await PoliciesGET(req);
    expect(res.status).toBe(200);
    expect(mockPolicyListByOwner).toHaveBeenCalledWith(OWNER);
  });
});

// ─── GET /api/policies/[id] ────────────────────────────────
describe("GET /api/policies/[id] — tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 401 when no auth", async () => {
    mockResolveAccessor.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/policies/p1");
    const res = await PolicyByIdGET(req, makeParams("p1"));
    expect(res.status).toBe(401);
  });

  it("should return 403 when not dataset owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: STRANGER, trusted: true });
    mockPolicyGetById.mockResolvedValue({ id: "p1", datasetId: "d1" });
    mockDatasetGetById.mockResolvedValue({ id: "d1", ownerAddress: OWNER });
    const req = new NextRequest("http://localhost/api/policies/p1");
    const res = await PolicyByIdGET(req, makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("should return policy when dataset owner", async () => {
    mockResolveAccessor.mockResolvedValue({ accessor: OWNER, trusted: true });
    mockPolicyGetById.mockResolvedValue({ id: "p1", datasetId: "d1" });
    mockDatasetGetById.mockResolvedValue({ id: "d1", ownerAddress: OWNER });
    const req = new NextRequest("http://localhost/api/policies/p1");
    const res = await PolicyByIdGET(req, makeParams("p1"));
    expect(res.status).toBe(200);
  });
});
