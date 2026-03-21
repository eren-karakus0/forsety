import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mock dependencies ---
const mockPolicyGetById = vi.fn();
const mockPolicyCreate = vi.fn();
const mockDatasetGetById = vi.fn();

vi.mock("@/lib/forsety", () => ({
  getForsetyClient: () => ({
    policies: {
      getById: mockPolicyGetById,
      create: mockPolicyCreate,
    },
    datasets: {
      getById: mockDatasetGetById,
    },
  }),
}));

const mockResolveAccessor = vi.fn();
const mockResolveAccessorStrict = vi.fn();

vi.mock("@/lib/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    resolveAccessor: (...args: unknown[]) => mockResolveAccessor(...args),
    resolveAccessorStrict: (...args: unknown[]) => mockResolveAccessorStrict(...args),
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

import { GET, PATCH } from "../../src/app/api/policies/[id]/route";

function makeParams(id: string = "policy-1") {
  return { params: Promise.resolve({ id }) };
}

const MOCK_POLICY = {
  id: "policy-1",
  datasetId: "ds-1",
  version: 1,
  allowedAccessors: ["0xuser123"],
  maxReads: 10,
  expiresAt: new Date("2026-12-31"),
  createdBy: "0xowner",
  createdAt: new Date(),
};

const MOCK_DATASET = {
  id: "ds-1",
  name: "test-dataset",
  ownerAddress: "0xowner",
  archivedAt: null,
};

describe("GET /api/policies/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
  });

  it("should return 401 when not authenticated", async () => {
    // Arrange
    mockResolveAccessor.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/policies/policy-1");

    // Act
    const res = await GET(req, makeParams());

    // Assert
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("should return 404 when policy not found", async () => {
    // Arrange
    mockPolicyGetById.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/policies/policy-1");

    // Act
    const res = await GET(req, makeParams());

    // Assert
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Policy not found");
  });

  it("should return 403 when dataset not found", async () => {
    // Arrange
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/policies/policy-1");

    // Act
    const res = await GET(req, makeParams());

    // Assert
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Forbidden");
  });

  it("should return 403 when caller is not dataset owner", async () => {
    // Arrange
    mockResolveAccessor.mockResolvedValue({ accessor: "0xstranger", trusted: true });
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);

    const req = new NextRequest("http://localhost/api/policies/policy-1");

    // Act
    const res = await GET(req, makeParams());

    // Assert
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("not dataset owner");
  });

  it("should return policy when caller is dataset owner", async () => {
    // Arrange
    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);

    const req = new NextRequest("http://localhost/api/policies/policy-1");

    // Act
    const res = await GET(req, makeParams());
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.id).toBe("policy-1");
    expect(json.datasetId).toBe("ds-1");
  });

  it("should handle policy with null optional fields", async () => {
    // Arrange
    const policyWithNulls = {
      ...MOCK_POLICY,
      maxReads: null,
      expiresAt: null,
    };

    mockResolveAccessor.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockPolicyGetById.mockResolvedValue(policyWithNulls);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);

    const req = new NextRequest("http://localhost/api/policies/policy-1");

    // Act
    const res = await GET(req, makeParams());
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.maxReads).toBeNull();
    expect(json.expiresAt).toBeNull();
  });
});

describe("PATCH /api/policies/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xowner", trusted: true });
  });

  it("should return 401 when not authenticated", async () => {
    // Arrange
    mockResolveAccessorStrict.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/policies/policy-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ maxReads: 20 }),
    });

    // Act
    const res = await PATCH(req, makeParams());

    // Assert
    expect(res.status).toBe(401);
  });

  it("should return 404 when policy not found", async () => {
    // Arrange
    mockPolicyGetById.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/policies/policy-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ maxReads: 20 }),
    });

    // Act
    const res = await PATCH(req, makeParams());

    // Assert
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Policy not found");
  });

  it("should return 403 when dataset not found", async () => {
    // Arrange
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/policies/policy-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ maxReads: 20 }),
    });

    // Act
    const res = await PATCH(req, makeParams());

    // Assert
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Forbidden");
  });

  it("should return 403 when caller is not dataset owner", async () => {
    // Arrange
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xstranger", trusted: true });
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);

    const req = new NextRequest("http://localhost/api/policies/policy-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ maxReads: 20 }),
    });

    // Act
    const res = await PATCH(req, makeParams());

    // Assert
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("not dataset owner");
  });

  it("should create new policy version when caller is owner", async () => {
    // Arrange
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);

    const newPolicy = { ...MOCK_POLICY, version: 2, maxReads: 20 };
    mockPolicyCreate.mockResolvedValue(newPolicy);

    const req = new NextRequest("http://localhost/api/policies/policy-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ maxReads: 20 }),
    });

    // Act
    const res = await PATCH(req, makeParams());
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.version).toBe(2);
    expect(json.maxReads).toBe(20);
    expect(mockPolicyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetId: "ds-1",
        maxReads: 20,
      })
    );
  });

  it("should update allowedAccessors field", async () => {
    // Arrange
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);

    const newAccessors = ["0xuser456", "0xuser789"];
    const newPolicy = { ...MOCK_POLICY, version: 2, allowedAccessors: newAccessors };
    mockPolicyCreate.mockResolvedValue(newPolicy);

    const req = new NextRequest("http://localhost/api/policies/policy-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ allowedAccessors: newAccessors }),
    });

    // Act
    const res = await PATCH(req, makeParams());
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.allowedAccessors).toEqual(newAccessors);
    expect(mockPolicyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedAccessors: newAccessors,
      })
    );
  });

  it("should update expiresAt field", async () => {
    // Arrange
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);

    const newExpiry = "2027-12-31T23:59:59.000Z";
    const newPolicy = { ...MOCK_POLICY, version: 2, expiresAt: new Date(newExpiry) };
    mockPolicyCreate.mockResolvedValue(newPolicy);

    const req = new NextRequest("http://localhost/api/policies/policy-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expiresAt: newExpiry }),
    });

    // Act
    const res = await PATCH(req, makeParams());
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(mockPolicyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresAt: expect.any(Date),
      })
    );
  });

  it("should preserve existing fields when not specified in update", async () => {
    // Arrange
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);

    const newPolicy = { ...MOCK_POLICY, version: 2, maxReads: 20 };
    mockPolicyCreate.mockResolvedValue(newPolicy);

    const req = new NextRequest("http://localhost/api/policies/policy-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ maxReads: 20 }),
    });

    // Act
    await PATCH(req, makeParams());

    // Assert
    expect(mockPolicyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetId: "ds-1",
        allowedAccessors: ["0xuser123"], // Preserved from original
        maxReads: 20, // Updated
        expiresAt: MOCK_POLICY.expiresAt, // Preserved from original
      })
    );
  });

  it("should handle updating multiple fields simultaneously", async () => {
    // Arrange
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);

    const updates = {
      allowedAccessors: ["0xnewuser"],
      maxReads: 100,
      expiresAt: "2028-01-01T00:00:00.000Z",
    };

    const newPolicy = { ...MOCK_POLICY, version: 2, ...updates };
    mockPolicyCreate.mockResolvedValue(newPolicy);

    const req = new NextRequest("http://localhost/api/policies/policy-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(updates),
    });

    // Act
    const res = await PATCH(req, makeParams());
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.allowedAccessors).toEqual(["0xnewuser"]);
    expect(json.maxReads).toBe(100);
  });

  it("should handle empty body gracefully", async () => {
    // Arrange
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);

    const newPolicy = { ...MOCK_POLICY, version: 2 };
    mockPolicyCreate.mockResolvedValue(newPolicy);

    const req = new NextRequest("http://localhost/api/policies/policy-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    // Act
    const res = await PATCH(req, makeParams());

    // Assert
    expect(res.status).toBe(200);
    expect(mockPolicyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetId: "ds-1",
        allowedAccessors: MOCK_POLICY.allowedAccessors,
        maxReads: MOCK_POLICY.maxReads,
      })
    );
  });

  it("should use auth.accessor for createdBy (not request body)", async () => {
    // Arrange
    mockResolveAccessorStrict.mockResolvedValue({ accessor: "0xowner", trusted: true });
    mockPolicyGetById.mockResolvedValue(MOCK_POLICY);
    mockDatasetGetById.mockResolvedValue(MOCK_DATASET);

    const newPolicy = { ...MOCK_POLICY, version: 2, createdBy: "0xowner" };
    mockPolicyCreate.mockResolvedValue(newPolicy);

    const req = new NextRequest("http://localhost/api/policies/policy-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ createdBy: "0xspoofed", maxReads: 50 }),
    });

    // Act
    await PATCH(req, makeParams());

    // Assert — createdBy must come from auth, not from request body
    expect(mockPolicyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: "0xowner",
      })
    );
  });
});
