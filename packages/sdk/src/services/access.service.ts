import { eq } from "drizzle-orm";
import type { Database } from "@forsety/db";
import { accessLogs } from "@forsety/db";
import type { PolicyService } from "./policy.service.js";
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
    private policyService: PolicyService
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

    const [log] = await this.db
      .insert(accessLogs)
      .values({
        datasetId: input.datasetId,
        policyId: policy?.id,
        accessorAddress: input.accessorAddress,
        operationType: input.operationType,
        blobHashAtRead: input.blobHashAtRead,
        readProof: input.readProof,
        policyVersion: policy?.version,
        policyHash: policy?.hash,
        licenseHash: undefined,
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
