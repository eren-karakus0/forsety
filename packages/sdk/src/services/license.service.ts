import { eq } from "drizzle-orm";
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
}
