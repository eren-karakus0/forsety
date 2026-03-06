import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { Database } from "@forsety/db";
import { accessLogs, datasets, licenses } from "@forsety/db";
import type { PolicyService } from "./policy.service.js";
import type { ShelbyWrapper } from "../shelby/client.js";
import { ForsetyValidationError, ForsetyAuthError } from "../errors.js";

export interface LogAccessInput {
  datasetId: string;
  accessorAddress: string;
  operationType: string;
  blobHashAtRead?: string;
  readProof?: string;
}

export class AccessService {
  constructor(
    private db: Database,
    private policyService: PolicyService,
    private shelby?: ShelbyWrapper
  ) {}

  async logAccess(input: LogAccessInput) {
    if (!input.datasetId || !input.accessorAddress || !input.operationType) {
      throw new ForsetyValidationError(
        "datasetId, accessorAddress, and operationType are required"
      );
    }

    const { allowed, policy } = await this.policyService.checkAccess(
      input.datasetId,
      input.accessorAddress
    );

    if (!allowed) {
      throw new ForsetyAuthError(
        `Access denied for ${input.accessorAddress} on dataset ${input.datasetId}`
      );
    }

    if (policy) {
      await this.policyService.incrementReads(policy.id);
    }

    // Resolve blob hash at read time from DB (current dataset state)
    let blobHashAtRead = input.blobHashAtRead;
    let shelbyBlobName: string | undefined;
    if (!blobHashAtRead) {
      const [dataset] = await this.db
        .select({
          blobHash: datasets.blobHash,
          shelbyBlobName: datasets.shelbyBlobName,
        })
        .from(datasets)
        .where(eq(datasets.id, input.datasetId))
        .limit(1);
      blobHashAtRead = dataset?.blobHash ?? undefined;
      shelbyBlobName = dataset?.shelbyBlobName ?? undefined;
    }

    // Resolve license hash from DB
    const datasetLicenses = await this.db
      .select({ termsHash: licenses.termsHash })
      .from(licenses)
      .where(eq(licenses.datasetId, input.datasetId))
      .limit(1);
    const licenseHash = datasetLicenses[0]?.termsHash ?? undefined;

    // Generate read proof: cryptographic attestation of access
    // Use a single timestamp for both the proof payload and the DB record
    // so the proof can be re-derived from exported data.
    const now = new Date();
    let readProof = input.readProof;
    if (!readProof && blobHashAtRead) {
      const proofPayload = JSON.stringify({
        datasetId: input.datasetId,
        accessorAddress: input.accessorAddress,
        blobHash: blobHashAtRead,
        blobName: shelbyBlobName ?? null,
        operationType: input.operationType,
        policyId: policy?.id ?? null,
        licenseHash: licenseHash ?? null,
        timestamp: now.toISOString(),
      });
      readProof = createHash("sha256").update(proofPayload).digest("hex");
    }

    const [log] = await this.db
      .insert(accessLogs)
      .values({
        datasetId: input.datasetId,
        policyId: policy?.id,
        accessorAddress: input.accessorAddress,
        operationType: input.operationType,
        blobHashAtRead,
        readProof,
        policyVersion: policy?.version,
        policyHash: policy?.hash,
        licenseHash,
        timestamp: now,
      })
      .returning();

    return log!;
  }

  async getByDatasetId(datasetId: string) {
    return this.db
      .select()
      .from(accessLogs)
      .where(eq(accessLogs.datasetId, datasetId))
      .orderBy(accessLogs.timestamp);
  }

  async getByAccessor(accessorAddress: string) {
    return this.db
      .select()
      .from(accessLogs)
      .where(eq(accessLogs.accessorAddress, accessorAddress))
      .orderBy(accessLogs.timestamp);
  }
}
