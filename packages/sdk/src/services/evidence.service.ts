import { eq, desc } from "drizzle-orm";
import { createHash } from "node:crypto";
import canonicalize from "canonicalize";
import type { Database } from "@forsety/db";
import {
  datasets,
  licenses,
  accessLogs,
  policies,
  evidencePacks,
  agentAuditLogs,
} from "@forsety/db";
import { ForsetyValidationError } from "../errors.js";

export interface EvidencePackData {
  id: string;
  version: string;
  generatedAt: string;
  dataset: {
    id: string;
    name: string;
    description: string | null;
    shelbyBlobId: string | null;
    shelbyBlobName: string | null;
    blobHash: string | null;
    sizeBytes: number | null;
    ownerAddress: string;
  };
  licenses: Array<{
    id: string;
    spdxType: string;
    grantorAddress: string;
    terms: Record<string, unknown> | null;
    termsHash: string | null;
  }>;
  policies: Array<{
    id: string;
    version: number;
    hash: string | null;
    allowedAccessors: string[];
    maxReads: number | null;
    readsConsumed: number;
    expiresAt: string | null;
  }>;
  accessLog: Array<{
    id: string;
    accessorAddress: string;
    operationType: string;
    blobHashAtRead: string | null;
    readProof: string | null;
    policyVersion: number | null;
    policyHash: string | null;
    licenseHash: string | null;
    timestamp: string;
  }>;
  agentActivity: Array<{
    agentId: string | null;
    toolName: string | null;
    status: string;
    resourceType: string | null;
    timestamp: string;
  }>;
}

export class EvidenceService {
  constructor(private db: Database) {}

  async generatePack(
    datasetId: string,
    generatedBy?: string
  ): Promise<{ json: EvidencePackData; hash: string }> {
    const [dataset] = await this.db
      .select()
      .from(datasets)
      .where(eq(datasets.id, datasetId))
      .limit(1);

    if (!dataset) {
      throw new ForsetyValidationError(`Dataset not found: ${datasetId}`);
    }

    const datasetLicenses = await this.db
      .select()
      .from(licenses)
      .where(eq(licenses.datasetId, datasetId));

    const datasetPolicies = await this.db
      .select()
      .from(policies)
      .where(eq(policies.datasetId, datasetId))
      .orderBy(policies.version);

    const datasetAccessLogs = await this.db
      .select()
      .from(accessLogs)
      .where(eq(accessLogs.datasetId, datasetId))
      .orderBy(accessLogs.timestamp);

    // Agent audit logs related to this dataset
    const datasetAuditLogs = await this.db
      .select()
      .from(agentAuditLogs)
      .where(eq(agentAuditLogs.resourceId, datasetId))
      .orderBy(agentAuditLogs.timestamp);

    const now = new Date().toISOString();

    const packJson: EvidencePackData = {
      id: crypto.randomUUID(),
      version: "2.0.0",
      generatedAt: now,
      dataset: {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        shelbyBlobId: dataset.shelbyBlobId,
        shelbyBlobName: dataset.shelbyBlobName,
        blobHash: dataset.blobHash,
        sizeBytes: dataset.sizeBytes,
        ownerAddress: dataset.ownerAddress,
      },
      licenses: datasetLicenses.map((l) => ({
        id: l.id,
        spdxType: l.spdxType,
        grantorAddress: l.grantorAddress,
        terms: l.terms,
        termsHash: l.termsHash,
      })),
      policies: datasetPolicies.map((p) => ({
        id: p.id,
        version: p.version,
        hash: p.hash,
        allowedAccessors: p.allowedAccessors,
        maxReads: p.maxReads,
        readsConsumed: p.readsConsumed,
        expiresAt: p.expiresAt?.toISOString() ?? null,
      })),
      accessLog: datasetAccessLogs.map((a) => ({
        id: a.id,
        accessorAddress: a.accessorAddress,
        operationType: a.operationType,
        blobHashAtRead: a.blobHashAtRead,
        readProof: a.readProof,
        policyVersion: a.policyVersion,
        policyHash: a.policyHash,
        licenseHash: a.licenseHash,
        timestamp: a.timestamp.toISOString(),
      })),
      agentActivity: datasetAuditLogs.map((l) => ({
        agentId: l.agentId,
        toolName: l.toolName,
        status: l.status,
        resourceType: l.resourceType,
        timestamp: l.timestamp.toISOString(),
      })),
    };

    const canonicalJson = canonicalize(packJson) ?? JSON.stringify(packJson);
    const packHash = createHash("sha256")
      .update(canonicalJson)
      .digest("hex");

    await this.db.insert(evidencePacks).values({
      datasetId,
      packJson: packJson as unknown as Record<string, unknown>,
      packJsonCanonical: canonicalJson,
      packHash,
      generatedBy,
    });

    return { json: packJson, hash: packHash };
  }

  async listAll(filters?: { limit?: number; offset?: number }) {
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const rows = await this.db
      .select({
        id: evidencePacks.id,
        datasetId: evidencePacks.datasetId,
        datasetName: datasets.name,
        packHash: evidencePacks.packHash,
        packJson: evidencePacks.packJson,
        generatedAt: evidencePacks.generatedAt,
        generatedBy: evidencePacks.generatedBy,
      })
      .from(evidencePacks)
      .innerJoin(datasets, eq(evidencePacks.datasetId, datasets.id))
      .orderBy(desc(evidencePacks.generatedAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async getByDatasetId(datasetId: string) {
    return this.db
      .select()
      .from(evidencePacks)
      .where(eq(evidencePacks.datasetId, datasetId))
      .orderBy(evidencePacks.generatedAt);
  }

  async getById(id: string) {
    const result = await this.db
      .select()
      .from(evidencePacks)
      .where(eq(evidencePacks.id, id))
      .limit(1);

    return result[0] ?? null;
  }
}
