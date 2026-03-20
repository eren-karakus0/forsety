"use server";

import { getForsetyClient } from "@/lib/forsety";
import { verifyMutationSignature } from "@/lib/verify-mutation-signature";
import { withAuth, getWalletFromSession } from "@/lib/with-auth";
import type { SignaturePayload } from "@/lib/types";

export interface EvidenceResult {
  success: boolean;
  error?: string;
  json?: Record<string, unknown>;
  hash?: string;
}

export async function generateEvidencePack(datasetId: string, sig: SignaturePayload): Promise<EvidenceResult> {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const sigCheck = await verifyMutationSignature(sig, wallet);
    if (!sigCheck.valid) return { success: false, error: sigCheck.error ?? "Signature invalid" };

    const client = getForsetyClient();
    const dataset = await client.datasets.getById(datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) {
      return { success: false, error: "Forbidden" };
    }

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

export async function fetchAllEvidencePacks(filters?: { limit?: number; offset?: number }) {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const packs = await client.evidence.listByOwner(wallet, filters);
    return packs.map((p) => ({
      ...p,
      generatedAt: p.generatedAt.toISOString(),
    }));
  }, []).catch((err) => {
    console.error("[fetchAllEvidencePacks]", err);
    return [];
  });
}

export async function fetchEvidencePackById(id: string) {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const pack = await client.evidence.getById(id);
    if (!pack) return null;

    const datasetWithLicense = await client.datasets.getWithLicense(pack.datasetId);
    if (!datasetWithLicense || datasetWithLicense.dataset.ownerAddress !== wallet) return null;

    return {
      ...pack,
      generatedAt: pack.generatedAt.toISOString(),
      datasetName: datasetWithLicense.dataset.name ?? "Unknown",
    };
  }, null).catch((err) => {
    console.error("[fetchEvidencePackById]", err);
    return null;
  });
}

export async function fetchAccessLogs(datasetId: string) {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const dataset = await client.datasets.getById(datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) return [];

    const logs = await client.access.getByDatasetId(datasetId);
    return logs.map((l) => ({
      ...l,
      timestamp: l.timestamp?.toISOString() ?? null,
    }));
  }, []).catch((err) => {
    console.error("[fetchAccessLogs]", err);
    return [];
  });
}
