import { eq, and, isNull, desc } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { Database } from "@forsety/db";
import { licenses } from "@forsety/db";
import { ForsetyValidationError } from "../errors.js";

export interface AttachLicenseInput {
  datasetId: string;
  spdxType: string;
  grantorAddress: string;
  terms?: Record<string, unknown>;
  termsHash?: string;
}

export interface UpdateLicenseInput {
  spdxType?: string;
  terms?: Record<string, unknown>;
}

export class LicenseService {
  constructor(private db: Database) {}

  async attach(input: AttachLicenseInput) {
    if (!input.datasetId || !input.spdxType || !input.grantorAddress) {
      throw new ForsetyValidationError(
        "datasetId, spdxType, and grantorAddress are required"
      );
    }

    const [license] = await this.db
      .insert(licenses)
      .values({
        datasetId: input.datasetId,
        spdxType: input.spdxType,
        grantorAddress: input.grantorAddress,
        terms: input.terms ?? {},
        termsHash: input.termsHash,
      })
      .returning();

    return license!;
  }

  async getByDatasetId(datasetId: string) {
    return this.db
      .select()
      .from(licenses)
      .where(eq(licenses.datasetId, datasetId));
  }

  async getById(id: string) {
    const result = await this.db
      .select()
      .from(licenses)
      .where(eq(licenses.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  /** Revoke a license (soft-delete). */
  async revoke(id: string) {
    const [updated] = await this.db
      .update(licenses)
      .set({ revokedAt: new Date() })
      .where(eq(licenses.id, id))
      .returning();
    return updated ?? null;
  }

  /** Update license terms/type. Cannot update revoked licenses. */
  async update(id: string, input: UpdateLicenseInput) {
    const existing = await this.getById(id);
    if (!existing) return null;
    if (existing.revokedAt) {
      throw new ForsetyValidationError("Cannot update a revoked license");
    }

    const updates: Partial<typeof licenses.$inferInsert> = {};
    if (input.spdxType) updates.spdxType = input.spdxType;
    if (input.terms !== undefined) updates.terms = input.terms;

    // Always recalculate termsHash from canonical payload when any field changes
    const finalSpdxType = input.spdxType ?? existing.spdxType;
    const finalTerms = input.terms !== undefined ? input.terms : existing.terms;
    const termsPayload = JSON.stringify({
      spdxType: finalSpdxType,
      grantorAddress: existing.grantorAddress,
      terms: finalTerms,
    });
    updates.termsHash = createHash("sha256")
      .update(termsPayload)
      .digest("hex");

    const [updated] = await this.db
      .update(licenses)
      .set(updates)
      .where(eq(licenses.id, id))
      .returning();
    return updated ?? null;
  }

  /** List licenses with pagination and optional filters. */
  async listAll(filters?: {
    datasetId?: string;
    includeRevoked?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;

    const conditions = [];
    if (filters?.datasetId)
      conditions.push(eq(licenses.datasetId, filters.datasetId));
    if (!filters?.includeRevoked)
      conditions.push(isNull(licenses.revokedAt));

    return this.db
      .select()
      .from(licenses)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(licenses.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
