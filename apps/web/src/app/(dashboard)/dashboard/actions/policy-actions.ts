"use server";

import { getForsetyClient } from "@/lib/forsety";
import { verifyMutationSignature } from "@/lib/verify-mutation-signature";
import { withAuth, getWalletFromSession } from "@/lib/with-auth";
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
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const sigCheck = await verifyMutationSignature(sig, wallet);
    if (!sigCheck.valid) return { success: false, error: sigCheck.error ?? "Signature invalid" };

    const client = getForsetyClient();
    const dataset = await client.datasets.getById(input.datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) {
      return { success: false, error: "Forbidden" };
    }

    const result = await client.policies.create({
      datasetId: input.datasetId,
      allowedAccessors: input.allowedAccessors,
      maxReads: input.maxReads,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });
    return { success: true, policy: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create policy",
    };
  }
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
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const sigCheck = await verifyMutationSignature(sig, wallet);
    if (!sigCheck.valid) return { success: false, error: sigCheck.error ?? "Signature invalid" };

    const client = getForsetyClient();
    const existing = await client.policies.getById(policyId);
    if (!existing) return { success: false, error: "Policy not found" };

    const dataset = await client.datasets.getById(existing.datasetId);
    if (!dataset || dataset.ownerAddress !== wallet) {
      return { success: false, error: "Forbidden" };
    }

    const result = await client.policies.create({
      datasetId: existing.datasetId,
      allowedAccessors: input.allowedAccessors,
      maxReads: input.maxReads,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });
    return { success: true, policy: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update policy",
    };
  }
}
