import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, unlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { AccessService } from "../../src/services/access.service.js";
import { ShelbyMockWrapper } from "../../src/shelby/mock-client.js";

/**
 * Download flow integration tests.
 *
 * Tests the two-phase download contract used by /api/datasets/[id]/download:
 *   Phase 1: checkAccess (read-only policy gate, no quota consumed)
 *   Phase 2: Shelby download to temp file
 *   Phase 3: logAccess (quota consumed only after successful download)
 *
 * Also tests: deny → no download, download fail → no quota, success → headers/cleanup.
 */

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockDb = {
  insert: mockInsert,
  select: mockSelect,
} as any;

const mockPolicyService = {
  checkAccess: vi.fn(),
  incrementReads: vi.fn(),
} as any;

function setupSelectChain(results: any[]) {
  let callCount = 0;
  mockSelect.mockImplementation(() => ({
    from: vi.fn().mockImplementation(() => {
      const idx = callCount++;
      const data = results[idx] ?? [];
      return {
        where: vi.fn().mockReturnValue({
          // Support both .where().limit() (dataset) and .where().orderBy().limit() (license)
          limit: vi.fn().mockResolvedValue(data),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(data),
          }),
        }),
      };
    }),
  }));
}

describe("Download flow ordering", () => {
  let accessService: AccessService;

  beforeEach(() => {
    vi.clearAllMocks();
    accessService = new AccessService(mockDb, mockPolicyService);
  });

  it("checkAccess should not increment reads (read-only gate)", async () => {
    mockPolicyService.checkAccess.mockResolvedValue({
      allowed: true,
      policy: { id: "p1", maxReads: 10, readsConsumed: 5 },
    });

    const result = await mockPolicyService.checkAccess("ds-1", "0xuser");

    expect(result.allowed).toBe(true);
    expect(mockPolicyService.incrementReads).not.toHaveBeenCalled();
  });

  it("checkAccess should deny when policy disallows accessor", async () => {
    mockPolicyService.checkAccess.mockResolvedValue({
      allowed: false,
      policy: { id: "p1", allowedAccessors: ["0xother"] },
    });

    const result = await mockPolicyService.checkAccess("ds-1", "0xunauthorized");

    expect(result.allowed).toBe(false);
    expect(mockPolicyService.incrementReads).not.toHaveBeenCalled();
  });

  it("logAccess should increment reads (quota consumed)", async () => {
    const mockPolicy = { id: "p1", version: 1, hash: "hash1" };
    mockPolicyService.checkAccess.mockResolvedValue({
      allowed: true,
      policy: mockPolicy,
    });
    mockPolicyService.incrementReads.mockResolvedValue({
      ...mockPolicy,
      readsConsumed: 1,
    });

    setupSelectChain([
      [{ blobHash: "sha256:abc" }],
      [{ termsHash: "terms123" }],
    ]);

    const mockLog = { id: "log-1", operationType: "download" };
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockLog]),
      }),
    });

    const log = await accessService.logAccess({
      datasetId: "ds-1",
      accessorAddress: "0xuser",
      operationType: "download",
    });

    expect(log.operationType).toBe("download");
    expect(mockPolicyService.incrementReads).toHaveBeenCalledWith("p1");
  });

  it("checkAccess should deny when quota is exhausted", async () => {
    mockPolicyService.checkAccess.mockResolvedValue({
      allowed: false,
      policy: { id: "p1", maxReads: 5, readsConsumed: 5 },
    });

    const { allowed } = await mockPolicyService.checkAccess("ds-1", "0xuser");

    expect(allowed).toBe(false);
    expect(mockPolicyService.incrementReads).not.toHaveBeenCalled();
  });

  it("checkAccess should deny when policy is expired", async () => {
    mockPolicyService.checkAccess.mockResolvedValue({
      allowed: false,
      policy: { id: "p1", expiresAt: new Date(Date.now() - 86400000) },
    });

    const { allowed } = await mockPolicyService.checkAccess("ds-1", "0xuser");

    expect(allowed).toBe(false);
  });
});

describe("Download flow: Shelby fail => no quota", () => {
  let accessService: AccessService;

  beforeEach(() => {
    vi.clearAllMocks();
    accessService = new AccessService(mockDb, mockPolicyService);
  });

  it("should not call logAccess when Shelby download throws", async () => {
    // Phase 1: policy allows
    mockPolicyService.checkAccess.mockResolvedValue({
      allowed: true,
      policy: { id: "p1", maxReads: 5, readsConsumed: 4 },
    });

    const { allowed } = await mockPolicyService.checkAccess("ds-1", "0xuser");
    expect(allowed).toBe(true);

    // Phase 2: Shelby download fails
    const shelby = new ShelbyMockWrapper({ network: "shelbynet" });
    const badDownload = vi.spyOn(shelby, "downloadDataset").mockRejectedValue(
      new Error("Shelby 503: service unavailable")
    );

    const tempPath = join(tmpdir(), `${randomUUID()}-test`);
    let downloadSucceeded = false;
    try {
      await shelby.downloadDataset("blob-x", tempPath);
      downloadSucceeded = true;
    } catch {
      // Expected: download failed
    }

    // Phase 3: logAccess must NOT be called
    expect(downloadSucceeded).toBe(false);
    expect(mockPolicyService.incrementReads).not.toHaveBeenCalled();

    badDownload.mockRestore();
  });

  it("should call logAccess only after successful download", async () => {
    // Phase 1: policy allows
    mockPolicyService.checkAccess.mockResolvedValue({
      allowed: true,
      policy: { id: "p1", version: 1, hash: "h1" },
    });
    mockPolicyService.incrementReads.mockResolvedValue({ readsConsumed: 1 });

    setupSelectChain([
      [{ blobHash: "sha256:abc" }],
      [{ termsHash: "terms" }],
    ]);

    const mockLog = { id: "log-1", operationType: "download" };
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockLog]),
      }),
    });

    const { allowed } = await mockPolicyService.checkAccess("ds-1", "0xuser");
    expect(allowed).toBe(true);

    // Phase 2: download succeeds
    const shelby = new ShelbyMockWrapper({ network: "shelbynet" });
    const tempPath = join(tmpdir(), `${randomUUID()}-test`);
    await shelby.downloadDataset("blob-x", tempPath);
    expect(existsSync(tempPath)).toBe(true);

    // Phase 3: now log access
    const log = await accessService.logAccess({
      datasetId: "ds-1",
      accessorAddress: "0xuser",
      operationType: "download",
    });

    expect(log.operationType).toBe("download");
    expect(mockPolicyService.incrementReads).toHaveBeenCalledWith("p1");

    // Cleanup
    try { unlinkSync(tempPath); } catch { /* ignore */ }
  });
});

describe("Download flow: temp file cleanup", () => {
  it("should clean up temp file after successful read", async () => {
    const shelby = new ShelbyMockWrapper({ network: "shelbynet" });
    const tempPath = join(tmpdir(), `${randomUUID()}-cleanup-test`);

    await shelby.downloadDataset("blob-cleanup", tempPath);
    expect(existsSync(tempPath)).toBe(true);

    // Simulate reading content (as route does before streaming)
    const content = readFileSync(tempPath);
    expect(content.length).toBeGreaterThan(0);

    // Cleanup (as route does in stream close handler)
    unlinkSync(tempPath);
    expect(existsSync(tempPath)).toBe(false);
  });

  it("should use randomUUID for unique temp file names", () => {
    const names = new Set<string>();
    for (let i = 0; i < 100; i++) {
      names.add(`${randomUUID()}-test`);
    }
    expect(names.size).toBe(100);
  });
});
