import { eq, and, isNull, inArray } from "drizzle-orm";
import type { Database } from "@forsety/db";
import { datasets, licenses } from "@forsety/db";
import type { ShelbyWrapper } from "../shelby/client.js";
import type { VectorSearchService } from "./vector-search.service.js";
import { ForsetyValidationError } from "../errors.js";
import { canonicalHash } from "../crypto/canonical-hash.js";

export interface UploadDatasetInput {
  filePath: string;
  name: string;
  description?: string;
  ownerAddress: string;
  license: {
    spdxType: string;
    grantorAddress: string;
    terms?: Record<string, unknown>;
  };
}

export class DatasetService {
  constructor(
    private db: Database,
    private shelby: ShelbyWrapper,
    private vectorSearch?: VectorSearchService
  ) {}

  async upload(input: UploadDatasetInput) {
    if (!input.name || !input.ownerAddress) {
      throw new ForsetyValidationError("name and ownerAddress are required");
    }

    const blobName = `forsety/${input.name.toLowerCase().replace(/\s+/g, "-")}`;

    const uploadResult = await this.shelby.uploadDataset(
      input.filePath,
      blobName
    );

    const [dataset] = await this.db
      .insert(datasets)
      .values({
        name: input.name,
        description: input.description,
        shelbyBlobId: uploadResult.blobId,
        shelbyBlobName: uploadResult.blobName,
        blobHash: uploadResult.hash,
        sizeBytes: uploadResult.sizeBytes,
        ownerAddress: input.ownerAddress,
      })
      .returning();

    const termsHash = canonicalHash({
      spdxType: input.license.spdxType,
      grantorAddress: input.license.grantorAddress,
      terms: input.license.terms ?? {},
    });

    const [license] = await this.db
      .insert(licenses)
      .values({
        datasetId: dataset!.id,
        spdxType: input.license.spdxType,
        grantorAddress: input.license.grantorAddress,
        terms: input.license.terms ?? {},
        termsHash,
      })
      .returning();

    // Fire-and-forget: auto-embed for vector search
    this.vectorSearch?.embedDataset(dataset!.id).catch((err) => {
      console.error(`[forsety] auto-embed dataset ${dataset!.id} failed:`, err);
    });

    return { dataset: dataset!, license: license! };
  }

  async getById(id: string) {
    const result = await this.db
      .select()
      .from(datasets)
      .where(eq(datasets.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  /** List active (non-archived) datasets. */
  async list() {
    return this.db
      .select()
      .from(datasets)
      .where(isNull(datasets.archivedAt))
      .orderBy(datasets.createdAt);
  }

  /** List all datasets including archived (admin view). */
  async listAll() {
    return this.db.select().from(datasets).orderBy(datasets.createdAt);
  }

  async listWithLicenses() {
    const allDatasets = await this.list();
    if (allDatasets.length === 0) return [];

    // Only fetch licenses for listed datasets (scoped)
    const datasetIds = allDatasets.map((d) => d.id);
    const datasetLicenses = await this.db
      .select()
      .from(licenses)
      .where(
        and(
          inArray(licenses.datasetId, datasetIds),
          isNull(licenses.revokedAt)
        )
      )
      .orderBy(licenses.createdAt);

    const licenseMap = new Map<string, string>();
    for (const lic of datasetLicenses) {
      licenseMap.set(lic.datasetId, lic.spdxType);
    }

    return allDatasets.map((d) => ({
      ...d,
      licenseSpdx: licenseMap.get(d.id) ?? null,
    }));
  }

  /** List datasets owned by a specific address. Non-archived by default. */
  async listByOwner(
    ownerAddress: string,
    options?: { includeArchived?: boolean }
  ) {
    const conditions = [eq(datasets.ownerAddress, ownerAddress)];
    if (!options?.includeArchived) {
      conditions.push(isNull(datasets.archivedAt));
    }
    return this.db
      .select()
      .from(datasets)
      .where(and(...conditions))
      .orderBy(datasets.createdAt);
  }

  /** List datasets with licenses, scoped to a specific owner. */
  async listWithLicensesByOwner(ownerAddress: string) {
    const ownerDatasets = await this.listByOwner(ownerAddress);
    if (ownerDatasets.length === 0) return [];

    // Only fetch licenses for owner's datasets (not all licenses)
    const datasetIds = ownerDatasets.map((d) => d.id);
    const datasetLicenses = await this.db
      .select()
      .from(licenses)
      .where(
        and(
          inArray(licenses.datasetId, datasetIds),
          isNull(licenses.revokedAt)
        )
      )
      .orderBy(licenses.createdAt);

    const licenseMap = new Map<string, string>();
    for (const lic of datasetLicenses) {
      licenseMap.set(lic.datasetId, lic.spdxType);
    }

    return ownerDatasets.map((d) => ({
      ...d,
      licenseSpdx: licenseMap.get(d.id) ?? null,
    }));
  }

  /** Soft-delete: set archivedAt timestamp. */
  async archive(id: string) {
    const [updated] = await this.db
      .update(datasets)
      .set({ archivedAt: new Date() })
      .where(eq(datasets.id, id))
      .returning();
    return updated ?? null;
  }

  /** Restore an archived dataset. */
  async restore(id: string) {
    const [updated] = await this.db
      .update(datasets)
      .set({ archivedAt: null })
      .where(eq(datasets.id, id))
      .returning();
    return updated ?? null;
  }

  /** Hard-delete: only allowed on archived datasets. */
  async delete(id: string) {
    const dataset = await this.getById(id);
    if (!dataset) return null;
    if (!dataset.archivedAt) {
      throw new ForsetyValidationError(
        "Dataset must be archived before deletion. Use archive() first."
      );
    }
    const [deleted] = await this.db
      .delete(datasets)
      .where(eq(datasets.id, id))
      .returning();
    return deleted ?? null;
  }

  async getWithLicense(id: string) {
    const dataset = await this.getById(id);
    if (!dataset) return null;

    const datasetLicenses = await this.db
      .select()
      .from(licenses)
      .where(eq(licenses.datasetId, id));

    return { dataset, licenses: datasetLicenses };
  }
}
