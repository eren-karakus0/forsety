import { eq, max, desc } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { Database } from "@forsety/db";
import { policies, datasets } from "@forsety/db";
import { ForsetyValidationError } from "../errors.js";

export interface CreatePolicyInput {
  datasetId: string;
  allowedAccessors: string[];
  maxReads?: number;
  expiresAt?: Date;
  createdBy?: string;
}

export class PolicyService {
  constructor(private db: Database) {}

  async create(input: CreatePolicyInput) {
    if (!input.datasetId || !input.allowedAccessors?.length) {
      throw new ForsetyValidationError(
        "datasetId and allowedAccessors are required"
      );
    }

    // Use transaction to prevent race conditions on version increment.
    // The unique(dataset_id, version) constraint is the final safety net.
    const result = await this.db.transaction(async (tx) => {
      const maxVersionResult = await tx
        .select({ maxVersion: max(policies.version) })
        .from(policies)
        .where(eq(policies.datasetId, input.datasetId));

      const nextVersion = (maxVersionResult[0]?.maxVersion ?? 0) + 1;

      const policyData = {
        datasetId: input.datasetId,
        allowedAccessors: input.allowedAccessors,
        maxReads: input.maxReads,
        expiresAt: input.expiresAt,
        version: nextVersion,
      };

      const hash = createHash("sha256")
        .update(JSON.stringify(policyData))
        .digest("hex");

      const [policy] = await tx
        .insert(policies)
        .values({
          ...policyData,
          hash,
          createdBy: input.createdBy,
        })
        .returning();

      return policy!;
    });

    return result;
  }

  async listAll(filters?: { limit?: number; offset?: number }) {
    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;

    return this.db
      .select({
        id: policies.id,
        datasetId: policies.datasetId,
        datasetName: datasets.name,
        version: policies.version,
        hash: policies.hash,
        allowedAccessors: policies.allowedAccessors,
        maxReads: policies.maxReads,
        readsConsumed: policies.readsConsumed,
        expiresAt: policies.expiresAt,
        createdAt: policies.createdAt,
        createdBy: policies.createdBy,
      })
      .from(policies)
      .innerJoin(datasets, eq(policies.datasetId, datasets.id))
      .orderBy(desc(policies.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /** List policies scoped to datasets owned by ownerAddress. */
  async listByOwner(
    ownerAddress: string,
    filters?: { limit?: number; offset?: number }
  ) {
    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;

    return this.db
      .select({
        id: policies.id,
        datasetId: policies.datasetId,
        datasetName: datasets.name,
        version: policies.version,
        hash: policies.hash,
        allowedAccessors: policies.allowedAccessors,
        maxReads: policies.maxReads,
        readsConsumed: policies.readsConsumed,
        expiresAt: policies.expiresAt,
        createdAt: policies.createdAt,
        createdBy: policies.createdBy,
      })
      .from(policies)
      .innerJoin(datasets, eq(policies.datasetId, datasets.id))
      .where(eq(datasets.ownerAddress, ownerAddress))
      .orderBy(desc(policies.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getLatestPerDataset() {
    const allPolicies = await this.db
      .select()
      .from(policies)
      .orderBy(desc(policies.version));

    const map = new Map<string, typeof policies.$inferSelect>();
    for (const p of allPolicies) {
      if (!map.has(p.datasetId)) {
        map.set(p.datasetId, p);
      }
    }
    return map;
  }

  async getByDatasetId(datasetId: string) {
    return this.db
      .select()
      .from(policies)
      .where(eq(policies.datasetId, datasetId))
      .orderBy(policies.version);
  }

  async getLatest(datasetId: string) {
    const result = await this.db
      .select()
      .from(policies)
      .where(eq(policies.datasetId, datasetId))
      .orderBy(desc(policies.version))
      .limit(1);

    return result[0] ?? null;
  }

  async getById(id: string) {
    const result = await this.db
      .select()
      .from(policies)
      .where(eq(policies.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  async checkAccess(
    datasetId: string,
    accessorAddress: string
  ): Promise<{ allowed: boolean; policy: typeof policies.$inferSelect | null }> {
    const allPolicies = await this.getByDatasetId(datasetId);
    const latestPolicy = allPolicies[allPolicies.length - 1];

    if (!latestPolicy) {
      return { allowed: false, policy: null };
    }

    const isAllowed =
      latestPolicy.allowedAccessors.includes(accessorAddress) ||
      latestPolicy.allowedAccessors.includes("*");

    if (!isAllowed) {
      return { allowed: false, policy: latestPolicy };
    }

    if (latestPolicy.expiresAt && new Date() > latestPolicy.expiresAt) {
      return { allowed: false, policy: latestPolicy };
    }

    if (
      latestPolicy.maxReads &&
      latestPolicy.readsConsumed >= latestPolicy.maxReads
    ) {
      return { allowed: false, policy: latestPolicy };
    }

    return { allowed: true, policy: latestPolicy };
  }

  async incrementReads(policyId: string) {
    const policy = await this.getById(policyId);
    if (!policy) return null;

    const [updated] = await this.db
      .update(policies)
      .set({ readsConsumed: policy.readsConsumed + 1 })
      .where(eq(policies.id, policyId))
      .returning();

    return updated!;
  }
}
