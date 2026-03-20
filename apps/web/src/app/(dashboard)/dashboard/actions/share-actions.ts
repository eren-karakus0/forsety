"use server";

import { getForsetyClient } from "@/lib/forsety";
import { verifyMutationSignature } from "@/lib/verify-mutation-signature";
import { getWalletFromSession } from "@/lib/with-auth";
import type { SignaturePayload } from "@/lib/types";

export async function createShareLink(input: {
  evidencePackId: string;
  mode: "full" | "redacted";
  ttlHours: number;
}, sig: SignaturePayload) {
  try {
    const wallet = await getWalletFromSession();
    if (!wallet) return { success: false, error: "Not authenticated" };

    const sigCheck = await verifyMutationSignature(sig, wallet);
    if (!sigCheck.valid) return { success: false, error: sigCheck.error ?? "Signature invalid" };

    const client = getForsetyClient();

    const pack = await client.evidence.getById(input.evidencePackId);
    if (!pack) return { success: false, error: "Evidence pack not found" };
    const dataset = await client.datasets.getWithLicense(pack.datasetId);
    if (!dataset || dataset.dataset.ownerAddress !== wallet) {
      return { success: false, error: "Access denied" };
    }

    const link = await client.share.createShareLink(input);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forsety.xyz";
    return {
      success: true,
      token: link.token,
      url: `${baseUrl}/verify/${link.token}`,
      expiresAt: link.expiresAt.toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create share link",
    };
  }
}
