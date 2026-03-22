import { eq, max, desc, sql, and } from "drizzle-orm";
import type { Database } from "@forsety/db";
import { policies, datasets } from "@forsety/db";
import { ForsetyValidationError } from "../errors.js";
import { canonicalHash } from "../crypto/canonical-hash.js";

export interface CreatePolicyInput {
  datasetId: string;
  allowedAccessors: string[];
  maxReads?: number;
  expiresAt?: Date;
  createdBy?: string;
}

/** Shared select fields for listAll/listByOwner queries. */
const POLICY_LIST_SELECT_FIELDS = {
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
} as const;

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

      const hash = canonicalHash(policyData as unknown as Record<string, unknown>);

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
      .select(POLICY_LIST_SELECT_FIELDS)
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
      .select(POLICY_LIST_SELECT_FIELDS)
      .from(policies)
      .innerJoin(datasets, eq(policies.datasetId, datasets.id))
      .where(eq(datasets.ownerAddress, ownerAddress))
      .orderBy(desc(policies.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /** Get latest policy per dataset, scoped to datasets owned by ownerAddress. */
  async getLatestPerDatasetByOwner(ownerAddress: string) {
    const maxVersions = this.db
      .select({
        datasetId: policies.datasetId,
        maxVersion: max(policies.version).as("max_version"),
      })
      .from(policies)
      .groupBy(policies.datasetId)
      .as("mv");

    const results = await this.db
      .select()
      .from(policies)
      .innerJoin(
        maxVersions,
        and(
          eq(policies.datasetId, maxVersions.datasetId),
          eq(policies.version, maxVersions.maxVersion)
        )
      )
      .innerJoin(datasets, eq(policies.datasetId, datasets.id))
      .where(eq(datasets.ownerAddress, ownerAddress));

    const map = new Map<string, typeof policies.$inferSelect>();
    for (const r of results) {
      map.set(r.policies.datasetId, r.policies);
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

  /** Shared policy validation logic for both checkAccess and checkAndIncrementReads. */
  private validatePolicyAccess(
    policy: typeof policies.$inferSelect,
    accessorAddress: string
  ): { allowed: boolean } {
    const isAllowed =
      policy.allowedAccessors.includes(accessorAddress) ||
      policy.allowedAccessors.includes("*");

    if (!isAllowed) return { allowed: false };
    if (policy.expiresAt && new Date() > policy.expiresAt) return { allowed: false };
    if (policy.maxReads != null && policy.readsConsumed >= policy.maxReads) return { allowed: false };

    return { allowed: true };
  }

  async checkAccess(
    datasetId: string,
    accessorAddress: string
  ): Promise<{ allowed: boolean; policy: typeof policies.$inferSelect | null }> {
    const latestPolicy = await this.getLatest(datasetId);
    if (!latestPolicy) return { allowed: false, policy: null };

    const { allowed } = this.validatePolicyAccess(latestPolicy, accessorAddress);
    return { allowed, policy: latestPolicy };
  }

  async incrementReads(policyId: string) {
    const [updated] = await this.db
      .update(policies)
      .set({ readsConsumed: sql`${policies.readsConsumed} + 1` })
      .where(eq(policies.id, policyId))
      .returning();

    return updated ?? null;
  }

  /**
   * Atomic check + increment: prevents race condition where concurrent
   * requests both pass the maxReads check before either increments.
   * Uses conditional UPDATE (reads_consumed < max_reads) as a single query.
   */
  async checkAndIncrementReads(
    datasetId: string,
    accessorAddress: string
  ): Promise<{
    allowed: boolean;
    policy: typeof policies.$inferSelect | null;
  }> {
    const latestPolicy = await this.getLatest(datasetId);
    if (!latestPolicy) return { allowed: false, policy: null };

    const { allowed } = this.validatePolicyAccess(latestPolicy, accessorAddress);
    if (!allowed) return { allowed: false, policy: latestPolicy };

    // If maxReads is set, atomically check + increment in a single UPDATE
    if (latestPolicy.maxReads != null) {
      const [updated] = await this.db
        .update(policies)
        .set({ readsConsumed: sql`${policies.readsConsumed} + 1` })
        .where(
          and(
            eq(policies.id, latestPolicy.id),
            sql`${policies.readsConsumed} < ${latestPolicy.maxReads}`
          )
        )
        .returning();

      if (!updated) {
        return { allowed: false, policy: latestPolicy };
      }

      return { allowed: true, policy: updated };
    }

    // No maxReads limit — increment without condition
    const [updated] = await this.db
      .update(policies)
      .set({ readsConsumed: sql`${policies.readsConsumed} + 1` })
      .where(eq(policies.id, latestPolicy.id))
      .returning();

    return { allowed: true, policy: updated ?? latestPolicy };
  }
}
