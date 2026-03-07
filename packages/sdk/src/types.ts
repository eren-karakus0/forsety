import { z } from "zod";

export const DatasetLicenseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  spdxIdentifier: z.string().optional(),
  permissions: z.array(z.string()),
  conditions: z.array(z.string()),
  limitations: z.array(z.string()),
});

export type DatasetLicense = z.infer<typeof DatasetLicenseSchema>;

export const AccessPolicySchema = z.object({
  id: z.string().uuid(),
  datasetId: z.string().uuid(),
  licenseId: z.string().uuid(),
  allowedOperations: z.array(
    z.enum(["read", "transform", "train", "evaluate", "redistribute"])
  ),
  expiresAt: z.string().datetime().optional(),
  maxAccessCount: z.number().int().positive().optional(),
});

export type AccessPolicy = z.infer<typeof AccessPolicySchema>;

export const EvidencePackSchema = z.object({
  id: z.string().uuid(),
  version: z.string(),
  generatedAt: z.string().datetime(),
  dataset: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    shelbyBlobId: z.string().nullable(),
    shelbyBlobName: z.string().nullable(),
    blobHash: z.string().nullable(),
    sizeBytes: z.number().nullable(),
    ownerAddress: z.string(),
  }),
  licenses: z.array(
    z.object({
      id: z.string().uuid(),
      spdxType: z.string(),
      grantorAddress: z.string(),
      terms: z.record(z.unknown()).nullable(),
      termsHash: z.string().nullable(),
    })
  ),
  policies: z.array(
    z.object({
      id: z.string().uuid(),
      version: z.number(),
      hash: z.string().nullable(),
      allowedAccessors: z.array(z.string()),
      maxReads: z.number().nullable(),
      readsConsumed: z.number(),
      expiresAt: z.string().nullable(),
    })
  ),
  accessLog: z.array(
    z.object({
      id: z.string().uuid(),
      accessorAddress: z.string(),
      operationType: z.string(),
      blobHashAtRead: z.string().nullable(),
      readProof: z.string().nullable(),
      policyVersion: z.number().nullable(),
      policyHash: z.string().nullable(),
      licenseHash: z.string().nullable(),
      timestamp: z.string(),
    })
  ),
});

export type EvidencePack = z.infer<typeof EvidencePackSchema>;

export interface ForsetyConfig {
  shelbyNetwork?: string;
  shelbyWalletAddress?: string;
  databaseUrl?: string;
  apiBaseUrl?: string;
  shelbyMode?: "live" | "mock";
}

export const UploadDatasetInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ownerAddress: z.string().min(1),
  license: z.object({
    spdxType: z.string().min(1),
    grantorAddress: z.string().min(1),
    terms: z.record(z.unknown()).optional(),
  }),
});

export type UploadDatasetInput = z.infer<typeof UploadDatasetInputSchema>;

export const CreatePolicyInputSchema = z.object({
  datasetId: z.string().uuid(),
  allowedAccessors: z.array(z.string()).min(1),
  maxReads: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  createdBy: z.string().optional(),
});

export type CreatePolicyInput = z.infer<typeof CreatePolicyInputSchema>;

export const LogAccessInputSchema = z.object({
  datasetId: z.string().uuid(),
  accessorAddress: z.string().min(1),
  operationType: z.enum(["read", "download", "verify"]),
});

export type LogAccessInput = z.infer<typeof LogAccessInputSchema>;
