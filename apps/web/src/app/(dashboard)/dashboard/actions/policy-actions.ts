"use server";

import { getForsetyClient } from "@/lib/forsety";
import { withSignedMutation } from "@/lib/with-mutation";
import { withAuth } from "@/lib/with-auth";
import type { SignaturePayload } from "@/lib/types";

export async function fetchAllPolicies() {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const pols = await client.policies.listByOwner(wallet);
    return pols.map((p) => ({
      ...p,
      expiresAt: p.expiresAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    }));
  }, []).catch((err) => {
    console.error("[fetchAllPolicies]", err);
    return [];
  });
}

export async function fetchPolicies(datasetId: string) {
  return withAuth(async (wallet) => {
    const client = getForsetyClient();
    const dataset = await client.datasets.getWithLicense(datasetId);
    if (!dataset || dataset.dataset.ownerAddress !== wallet) return [];
    return client.policies.getByDatasetId(datasetId);
  }, []).catch((err) => {
    console.error("[fetchPolicies]", err);
    return [];
  });
}

export async function createPolicy(input: {
  datasetId: string;
  allowedAccessors: string[];
  maxReads?: number;
  expiresAt?: string;
}, sig: SignaturePayload) {
  return withSignedMutation(sig, async (wallet, client) => {
    const dataset = await client.datasets.getById(input.datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) {
      throw new Error("Forbidden");
    }
    const result = await client.policies.create({
      datasetId: input.datasetId,
      allowedAccessors: input.allowedAccessors,
      maxReads: input.maxReads,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });
    return { policy: result };
  });
}

export async function updatePolicy(
  policyId: string,
  input: {
    allowedAccessors: string[];
    maxReads?: number;
    expiresAt?: string;
  },
  sig: SignaturePayload,
) {
  return withSignedMutation(sig, async (wallet, client) => {
    const existing = await client.policies.getById(policyId);
    if (!existing) throw new Error("Policy not found");

    const dataset = await client.datasets.getById(existing.datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) {
      throw new Error("Forbidden");
    }

    const result = await client.policies.create({
      datasetId: existing.datasetId,
      allowedAccessors: input.allowedAccessors,
      maxReads: input.maxReads,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });
    return { policy: result };
  });
}
