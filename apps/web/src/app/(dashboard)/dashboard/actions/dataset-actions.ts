"use server";

import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getForsetyClient } from "@/lib/forsety";
import { verifyMutationSignature } from "@/lib/verify-mutation-signature";
import { withAuth } from "@/lib/with-auth";
import { getWalletFromSession } from "@/lib/with-auth";
import type { SignaturePayload } from "@/lib/types";

export interface UploadResult {
  success: boolean;
  error?: string;
  datasetId?: string;
}

export async function uploadDataset(formData: FormData, sig: SignaturePayload): Promise<UploadResult> {
  const wallet = await getWalletFromSession();
  if (!wallet) return { success: false, error: "Not authenticated" };

  const sigCheck = await verifyMutationSignature(sig, wallet);
  if (!sigCheck.valid) return { success: false, error: sigCheck.error ?? "Signature invalid" };

  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const license = formData.get("license") as string;

  if (!name || !license) {
    return { success: false, error: "Missing required fields" };
  }

  if (!file || file.size === 0) {
    return { success: false, error: "File is required" };
  }

  let tempPath: string | null = null;

  try {
    const client = getForsetyClient();

    const uploadDir = join(tmpdir(), "forsety-uploads");
    mkdirSync(uploadDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    tempPath = join(uploadDir, `${Date.now()}-${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(tempPath, buffer);

    const result = await client.datasets.upload({
      filePath: tempPath,
      name,
      description: description || undefined,
      ownerAddress: wallet,
      license: {
        spdxType: license,
        grantorAddress: wallet,
      },
    });

    return { success: true, datasetId: result.dataset.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  } finally {
    if (tempPath) {
      try { unlinkSync(tempPath); } catch { /* ignore */ }
    }
  }
}

export async function fetchDatasetDetail(id: string) {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const result = await client.datasets.getWithLicense(id);
    if (!result || result.dataset.ownerAddress !== wallet) return null;
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
  }, null).catch((err) => {
    console.error("[fetchDatasetDetail]", err);
    return null;
  });
}

export async function fetchDatasetsWithStatus() {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const [allDatasets, allLicenses, latestPolicies] = await Promise.all([
      client.datasets.listByOwner(wallet, { includeArchived: true }),
      client.licenses.listByOwner(wallet, { includeRevoked: false }),
      client.policies.getLatestPerDatasetByOwner(wallet),
    ]);

    if (allDatasets.length === 0) return [];

    const licenseMap = new Map<string, string>();
    for (const lic of allLicenses) {
      licenseMap.set(lic.datasetId, lic.spdxType);
    }

    return allDatasets.map((d) => {
      const policy = latestPolicies.get(d.id);
      let status: "active" | "warning" | "expired" | "no-policy" = "no-policy";
      if (policy) {
        if (!policy.expiresAt) {
          status = "active";
        } else {
          const exp = new Date(policy.expiresAt);
          const now = new Date();
          if (exp < now) status = "expired";
          else if (exp.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) status = "warning";
          else status = "active";
        }
      }
      return {
        id: d.id,
        name: d.name,
        license: licenseMap.get(d.id) ?? "-",
        status,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
        blobHash: d.blobHash,
        sizeBytes: d.sizeBytes,
        archivedAt: d.archivedAt ? new Date(d.archivedAt).toISOString() : null,
      };
    });
  }, [] as never[]).catch((err) => {
    console.error("[fetchDatasetsWithStatus]", err);
    return [];
  });
}

export async function fetchDatasetsList() {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const list = await client.datasets.listByOwner(wallet);
    return list.map((d) => ({ id: d.id, name: d.name }));
  }, []).catch((err) => {
    console.error("[fetchDatasetsList]", err);
    return [];
  });
}

export async function bulkDeleteDatasets(ids: string[], sig: SignaturePayload) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const sigCheck = await verifyMutationSignature(sig, wallet);
    if (!sigCheck.valid) return { success: false, error: sigCheck.error ?? "Signature invalid" };

    const client = getForsetyClient();
    const allDatasets = await client.datasets.listByIds(ids);
    const datasetMap = new Map(allDatasets.map((d) => [d.id, d]));

    const results = [];
    for (const id of ids) {
      const dataset = datasetMap.get(id);
      if (!dataset || dataset.ownerAddress !== wallet) {
        results.push({ id, archived: false, error: "Forbidden" });
        continue;
      }
      const archived = await client.datasets.archive(id);
      results.push({ id, archived: !!archived });
    }
    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bulk archive failed",
    };
  }
}

export async function bulkExportDatasets(ids: string[]) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const client = getForsetyClient();
    const allDatasets = await client.datasets.listByIds(ids);
    const ownedIds = allDatasets
      .filter((d) => d.ownerAddress === wallet)
      .map((d) => d.id);

    const data = [];
    for (const id of ownedIds) {
      const result = await client.datasets.getWithLicense(id);
      if (result) {
        data.push({
          dataset: {
            ...result.dataset,
            createdAt: result.dataset.createdAt.toISOString(),
          },
          licenses: result.licenses.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
          })),
        });
      }
    }
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bulk export failed",
    };
  }
}
