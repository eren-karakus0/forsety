"use server";

import { withSignedMutation } from "@/lib/with-mutation";
import type { SignaturePayload } from "@/lib/types";

export async function createShareLink(input: {
  evidencePackId: string;
  mode: "full" | "redacted";
  ttlHours: number;
}, sig: SignaturePayload) {
  return withSignedMutation(sig, async (wallet, client) => {
    const pack = await client.evidence.getById(input.evidencePackId);
    if (!pack) throw new Error("Evidence pack not found");

    const dataset = await client.datasets.getWithLicense(pack.datasetId);
    if (!dataset || dataset.dataset.ownerAddress !== wallet) {
      throw new Error("Access denied");
    }

    const link = await client.share.createShareLink(input);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forsety.xyz";
    return {
      token: link.token,
      url: `${baseUrl}/verify/${link.token}`,
      expiresAt: link.expiresAt.toISOString(),
    };
  });
}
