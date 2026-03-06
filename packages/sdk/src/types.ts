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
  datasetId: z.string().uuid(),
  policyId: z.string().uuid(),
  shelbyCommitment: z.string(),
  shelbyBlobId: z.string(),
  timestamp: z.string().datetime(),
  accessorId: z.string(),
  operationType: z.string(),
  proofHash: z.string(),
});

export type EvidencePack = z.infer<typeof EvidencePackSchema>;

export interface ForsetyConfig {
  shelbyRpcUrl?: string;
  shelbyWalletAddress?: string;
  apiBaseUrl?: string;
}
