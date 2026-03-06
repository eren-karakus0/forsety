import { describe, it, expect } from "vitest";
import {
  ForsetyClient,
  ForsetyError,
  ForsetyAuthError,
  ForsetyUploadError,
  ForsetyValidationError,
  EvidencePackSchema,
  DatasetLicenseSchema,
  AccessPolicySchema,
} from "../src/index.js";

describe("ForsetyClient", () => {
  it("should instantiate with default config", () => {
    const client = new ForsetyClient();
    expect(client).toBeInstanceOf(ForsetyClient);
  });

  it("should instantiate with custom config", () => {
    const client = new ForsetyClient({
      shelbyRpcUrl: "https://custom-rpc.example.com",
      apiBaseUrl: "https://api.example.com",
    });
    expect(client).toBeInstanceOf(ForsetyClient);
  });

  it("should throw not implemented for createEvidencePack", async () => {
    const client = new ForsetyClient();
    await expect(
      client.createEvidencePack("path", "policy-id")
    ).rejects.toThrow("Not implemented");
  });

  it("should throw not implemented for verifyEvidencePack", async () => {
    const client = new ForsetyClient();
    await expect(client.verifyEvidencePack("id")).rejects.toThrow(
      "Not implemented"
    );
  });

  it("should throw not implemented for getEvidencePack", async () => {
    const client = new ForsetyClient();
    await expect(client.getEvidencePack("id")).rejects.toThrow(
      "Not implemented"
    );
  });
});

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
      datasetId: "550e8400-e29b-41d4-a716-446655440001",
      policyId: "550e8400-e29b-41d4-a716-446655440002",
      shelbyCommitment: "abc123",
      shelbyBlobId: "blob-001",
      timestamp: "2026-03-06T12:00:00Z",
      accessorId: "user-001",
      operationType: "read",
      proofHash: "hash-xyz",
    });
    expect(result.success).toBe(true);
  });
});
