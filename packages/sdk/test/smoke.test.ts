import { describe, it, expect } from "vitest";
import {
  ForsetyError,
  ForsetyAuthError,
  ForsetyUploadError,
  ForsetyValidationError,
  EvidencePackSchema,
  DatasetLicenseSchema,
  AccessPolicySchema,
  UploadDatasetInputSchema,
  CreatePolicyInputSchema,
  LogAccessInputSchema,
} from "../src/index.js";

describe("Error classes", () => {
  it("ForsetyError should have code property", () => {
    const err = new ForsetyError("test", "TEST_CODE");
    expect(err.message).toBe("test");
    expect(err.code).toBe("TEST_CODE");
    expect(err.name).toBe("ForsetyError");
  });

  it("ForsetyAuthError should extend ForsetyError", () => {
    const err = new ForsetyAuthError("auth failed");
    expect(err).toBeInstanceOf(ForsetyError);
    expect(err.code).toBe("AUTH_ERROR");
  });

  it("ForsetyUploadError should extend ForsetyError", () => {
    const err = new ForsetyUploadError("upload failed");
    expect(err).toBeInstanceOf(ForsetyError);
    expect(err.code).toBe("UPLOAD_ERROR");
  });

  it("ForsetyValidationError should extend ForsetyError", () => {
    const err = new ForsetyValidationError("invalid");
    expect(err).toBeInstanceOf(ForsetyError);
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("ForsetyError should preserve cause", () => {
    const cause = new Error("original");
    const err = new ForsetyError("wrapped", "WRAP", cause);
    expect(err.cause).toBe(cause);
  });
});

describe("Zod schemas", () => {
  it("DatasetLicenseSchema should validate correct input", () => {
    const result = DatasetLicenseSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "MIT License",
      spdxIdentifier: "MIT",
      permissions: ["commercial-use", "modification"],
      conditions: ["include-copyright"],
      limitations: ["liability"],
    });
    expect(result.success).toBe(true);
  });

  it("DatasetLicenseSchema should reject invalid input", () => {
    const result = DatasetLicenseSchema.safeParse({
      id: "not-a-uuid",
      name: 123,
    });
    expect(result.success).toBe(false);
  });

  it("AccessPolicySchema should validate correct input", () => {
    const result = AccessPolicySchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      datasetId: "550e8400-e29b-41d4-a716-446655440001",
      licenseId: "550e8400-e29b-41d4-a716-446655440002",
      allowedOperations: ["read", "transform"],
    });
    expect(result.success).toBe(true);
  });

  it("EvidencePackSchema should validate correct input", () => {
    const result = EvidencePackSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      version: "1.0.0",
      generatedAt: "2026-03-06T12:00:00Z",
      dataset: {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Test Dataset",
        description: null,
        shelbyBlobId: "blob-001",
        shelbyBlobName: "forsety/test",
        blobHash: "sha256:abc123",
        sizeBytes: 1024,
        ownerAddress: "0xabc",
      },
      licenses: [
        {
          id: "550e8400-e29b-41d4-a716-446655440002",
          spdxType: "MIT",
          grantorAddress: "0xabc",
          terms: { attribution: true },
          termsHash: "hash123",
        },
      ],
      policies: [
        {
          id: "550e8400-e29b-41d4-a716-446655440003",
          version: 1,
          hash: "policyhash",
          allowedAccessors: ["*"],
          maxReads: 100,
          readsConsumed: 5,
          expiresAt: null,
        },
      ],
      accessLog: [
        {
          id: "550e8400-e29b-41d4-a716-446655440004",
          accessorAddress: "0xdef",
          operationType: "read",
          blobHashAtRead: null,
          readProof: null,
          policyVersion: 1,
          policyHash: "policyhash",
          timestamp: "2026-03-06T12:00:00Z",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("EvidencePackSchema should reject missing required fields", () => {
    const result = EvidencePackSchema.safeParse({
      id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("UploadDatasetInputSchema should validate", () => {
    const result = UploadDatasetInputSchema.safeParse({
      name: "Test Dataset",
      ownerAddress: "0xabc",
      license: {
        spdxType: "MIT",
        grantorAddress: "0xabc",
      },
    });
    expect(result.success).toBe(true);
  });

  it("UploadDatasetInputSchema should reject empty name", () => {
    const result = UploadDatasetInputSchema.safeParse({
      name: "",
      ownerAddress: "0xabc",
      license: { spdxType: "MIT", grantorAddress: "0xabc" },
    });
    expect(result.success).toBe(false);
  });

  it("CreatePolicyInputSchema should validate", () => {
    const result = CreatePolicyInputSchema.safeParse({
      datasetId: "550e8400-e29b-41d4-a716-446655440000",
      allowedAccessors: ["0xabc"],
      maxReads: 100,
    });
    expect(result.success).toBe(true);
  });

  it("CreatePolicyInputSchema should reject empty accessors", () => {
    const result = CreatePolicyInputSchema.safeParse({
      datasetId: "550e8400-e29b-41d4-a716-446655440000",
      allowedAccessors: [],
    });
    expect(result.success).toBe(false);
  });

  it("LogAccessInputSchema should validate", () => {
    const result = LogAccessInputSchema.safeParse({
      datasetId: "550e8400-e29b-41d4-a716-446655440000",
      accessorAddress: "0xabc",
      operationType: "read",
    });
    expect(result.success).toBe(true);
  });

  it("LogAccessInputSchema should reject invalid operation", () => {
    const result = LogAccessInputSchema.safeParse({
      datasetId: "550e8400-e29b-41d4-a716-446655440000",
      accessorAddress: "0xabc",
      operationType: "delete",
    });
    expect(result.success).toBe(false);
  });
});
