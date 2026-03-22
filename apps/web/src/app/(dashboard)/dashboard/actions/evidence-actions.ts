"use server";

import * as Sentry from "@sentry/nextjs";
import { getForsetyClient } from "@/lib/forsety";
import { withSignedMutation } from "@/lib/with-mutation";
import { withAuth } from "@/lib/with-auth";
import type { SignaturePayload } from "@/lib/types";

export interface EvidenceResult {
  success: boolean;
  error?: string;
  json?: Record<string, unknown>;
  hash?: string;
}

export async function generateEvidencePack(datasetId: string, sig: SignaturePayload): Promise<EvidenceResult> {
  return withSignedMutation(sig, async (wallet, client) => {
    const dataset = await client.datasets.getById(datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) {
      throw new Error("Forbidden");
    }

    const result = await client.evidence.generatePack(datasetId);
    return {
      json: result.json as unknown as Record<string, unknown>,
      hash: result.hash,
    };
  });
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
    Sentry.captureException(err, { extra: { action: "fetchAllEvidencePacks" } });
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
    Sentry.captureException(err, { extra: { action: "fetchEvidencePackById" } });
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
    Sentry.captureException(err, { extra: { action: "fetchAccessLogs" } });
    return [];
  });
}
