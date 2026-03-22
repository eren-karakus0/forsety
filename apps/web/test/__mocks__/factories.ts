/**
 * Shared mock factories for test data.
 * Usage: import { createMockDataset, createMockAgent } from "../__mocks__/factories";
 */

let counter = 0;
function nextId(prefix = "id") {
  return `${prefix}-${++counter}`;
}

export function createMockDataset(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId("ds"),
    name: "Test Dataset",
    description: null,
    ownerAddress: "0xaaa111bbb222ccc333",
    shelbyBlobId: "blob-1",
    shelbyBlobName: "test-blob",
    blobHash: "abc123",
    sizeBytes: 1024,
    archivedAt: null,
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockPolicy(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId("pol"),
    datasetId: "ds-1",
    version: 1,
    hash: "hash123",
    allowedAccessors: ["0xaaa111bbb222ccc333"],
    maxReads: null,
    readsConsumed: 0,
    expiresAt: null,
    createdBy: "0xaaa111bbb222ccc333",
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId("agent"),
    name: "Test Agent",
    description: null,
    ownerAddress: "0xaaa111bbb222ccc333",
    permissions: ["read", "write"],
    allowedDatasets: [],
    isActive: true,
    lastSeenAt: null,
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockLicense(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId("lic"),
    datasetId: "ds-1",
    spdxType: "MIT",
    grantorAddress: "0xaaa111bbb222ccc333",
    terms: null,
    termsHash: null,
    revokedAt: null,
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockEvidencePack(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId("ep"),
    datasetId: "ds-1",
    packHash: "pack-hash-123",
    packJson: {},
    generatedAt: new Date("2024-01-01"),
    generatedBy: "0xaaa111bbb222ccc333",
    ...overrides,
  };
}
