import { eq, and, gte, lte, desc, isNull, count as sqlCount } from "drizzle-orm";
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

export interface AccessLogFilters {
  datasetId?: string;
  accessorAddress?: string;
  operationType?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
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

    const { allowed, policy } = await this.policyService.checkAndIncrementReads(
      input.datasetId,
      input.accessorAddress
    );

    if (!allowed) {
      throw new ForsetyAuthError(
        `Access denied for ${input.accessorAddress} on dataset ${input.datasetId}`
      );
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

    // Resolve license hash from DB — latest active (non-revoked) license
    const datasetLicenses = await this.db
      .select({ termsHash: licenses.termsHash })
      .from(licenses)
      .where(and(eq(licenses.datasetId, input.datasetId), isNull(licenses.revokedAt)))
      .orderBy(desc(licenses.createdAt))
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

  /** List access logs with filtering and pagination. */
  async listAll(filters?: AccessLogFilters) {
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const conditions = this.buildConditions(filters);

    return this.db
      .select()
      .from(accessLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(accessLogs.timestamp))
      .limit(limit)
      .offset(offset);
  }

  /** Count access logs matching filters (for pagination total). */
  async count(filters?: AccessLogFilters) {
    const conditions = this.buildConditions(filters);

    const result = await this.db
      .select({ count: sqlCount() })
      .from(accessLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result[0]?.count ?? 0;
  }

  /** List access logs scoped to datasets owned by ownerAddress. */
  async listByOwner(ownerAddress: string, filters?: AccessLogFilters) {
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const conditions = this.buildOwnerConditions(ownerAddress, filters);

    return this.db
      .select({
        id: accessLogs.id,
        datasetId: accessLogs.datasetId,
        policyId: accessLogs.policyId,
        accessorAddress: accessLogs.accessorAddress,
        operationType: accessLogs.operationType,
        blobHashAtRead: accessLogs.blobHashAtRead,
        readProof: accessLogs.readProof,
        policyVersion: accessLogs.policyVersion,
        policyHash: accessLogs.policyHash,
        licenseHash: accessLogs.licenseHash,
        timestamp: accessLogs.timestamp,
      })
      .from(accessLogs)
      .innerJoin(datasets, eq(accessLogs.datasetId, datasets.id))
      .where(and(...conditions))
      .orderBy(desc(accessLogs.timestamp))
      .limit(limit)
      .offset(offset);
  }

  /** Count access logs scoped to datasets owned by ownerAddress. */
  async countByOwner(ownerAddress: string, filters?: AccessLogFilters) {
    const conditions = this.buildOwnerConditions(ownerAddress, filters);

    const result = await this.db
      .select({ count: sqlCount() })
      .from(accessLogs)
      .innerJoin(datasets, eq(accessLogs.datasetId, datasets.id))
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  private buildOwnerConditions(ownerAddress: string, filters?: AccessLogFilters) {
    const conditions = [eq(datasets.ownerAddress, ownerAddress)];
    if (filters?.datasetId)
      conditions.push(eq(accessLogs.datasetId, filters.datasetId));
    if (filters?.accessorAddress)
      conditions.push(eq(accessLogs.accessorAddress, filters.accessorAddress));
    if (filters?.operationType)
      conditions.push(eq(accessLogs.operationType, filters.operationType));
    if (filters?.from)
      conditions.push(gte(accessLogs.timestamp, filters.from));
    if (filters?.to)
      conditions.push(lte(accessLogs.timestamp, filters.to));
    return conditions;
  }

  private buildConditions(filters?: AccessLogFilters) {
    const conditions = [];
    if (filters?.datasetId)
      conditions.push(eq(accessLogs.datasetId, filters.datasetId));
    if (filters?.accessorAddress)
      conditions.push(eq(accessLogs.accessorAddress, filters.accessorAddress));
    if (filters?.operationType)
      conditions.push(eq(accessLogs.operationType, filters.operationType));
    if (filters?.from)
      conditions.push(gte(accessLogs.timestamp, filters.from));
    if (filters?.to)
      conditions.push(lte(accessLogs.timestamp, filters.to));
    return conditions;
  }
}
