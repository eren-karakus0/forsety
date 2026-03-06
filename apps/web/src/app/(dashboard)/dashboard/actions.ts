"use server";

import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getForsetyClient } from "@/lib/forsety";

export interface UploadResult {
  success: boolean;
  error?: string;
  datasetId?: string;
}

export async function uploadDataset(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const license = formData.get("license") as string;
  const ownerAddress = formData.get("ownerAddress") as string;

  if (!name || !license || !ownerAddress) {
    return { success: false, error: "Missing required fields" };
  }

  if (!file || file.size === 0) {
    return { success: false, error: "File is required" };
  }

  let tempPath: string | null = null;

  try {
    const client = getForsetyClient();

    // Write uploaded file to temp directory for Shelby CLI access
    const uploadDir = join(tmpdir(), "forsety-uploads");
    mkdirSync(uploadDir, { recursive: true });
    // Sanitize filename: strip path separators and special chars
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    tempPath = join(uploadDir, `${Date.now()}-${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(tempPath, buffer);

    const result = await client.datasets.upload({
      filePath: tempPath,
      name,
      description: description || undefined,
      ownerAddress,
      license: {
        spdxType: license,
        grantorAddress: ownerAddress,
      },
    });

    return { success: true, datasetId: result.dataset.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  } finally {
    // Cleanup temp file
    if (tempPath) {
      try { unlinkSync(tempPath); } catch { /* ignore */ }
    }
  }
}

export interface EvidenceResult {
  success: boolean;
  error?: string;
  json?: Record<string, unknown>;
  hash?: string;
}

export async function fetchDatasetDetail(id: string) {
  try {
    const client = getForsetyClient();
    const result = await client.datasets.getWithLicense(id);
    if (!result) return null;
    return {
      dataset: {
        ...result.dataset,
        createdAt: result.dataset.createdAt.toISOString(),
      },
      licenses: result.licenses.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  } catch {
    return null;
  }
}

export async function generateEvidencePack(datasetId: string): Promise<EvidenceResult> {
  try {
    const client = getForsetyClient();
    const result = await client.evidence.generatePack(datasetId);
    return {
      success: true,
      json: result.json as unknown as Record<string, unknown>,
      hash: result.hash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Generation failed",
    };
  }
}
