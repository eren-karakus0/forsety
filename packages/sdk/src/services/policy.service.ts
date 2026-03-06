import { eq, max } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { Database } from "@forsety/db";
import { policies } from "@forsety/db";
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

    const maxVersionResult = await this.db
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

    const [policy] = await this.db
      .insert(policies)
      .values({
        ...policyData,
        hash,
        createdBy: input.createdBy,
      })
      .returning();

    return policy!;
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
      .orderBy(policies.version)
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
