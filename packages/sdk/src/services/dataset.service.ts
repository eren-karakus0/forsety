import { eq } from "drizzle-orm";
import type { Database } from "@forsety/db";
import { datasets, licenses } from "@forsety/db";
import type { ShelbyWrapper } from "../shelby/client.js";
import { ForsetyValidationError } from "../errors.js";

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
    private shelby: ShelbyWrapper
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

    const termsHash = uploadResult.hash;

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

  async list() {
    return this.db.select().from(datasets).orderBy(datasets.createdAt);
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
