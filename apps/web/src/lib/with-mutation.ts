"use server";

import { getForsetyClient } from "@/lib/forsety";
import { verifyMutationSignature } from "@/lib/verify-mutation-signature";
import { getWalletFromSession } from "@/lib/with-auth";
import type { ForsetyClient } from "@forsety/sdk";
import type { SignaturePayload } from "@/lib/types";

type MutationSuccess<T> = { success: true; error?: undefined } & T;
type MutationError = { success: false; error: string };
type MutationResult<T> = MutationSuccess<T> | MutationError;

export async function withSignedMutation<T extends Record<string, unknown>>(
  sig: SignaturePayload,
  handler: (wallet: string, client: ForsetyClient) => Promise<T>
): Promise<MutationResult<T>> {
  const wallet = await getWalletFromSession();
  if (!wallet) return { success: false, error: "Not authenticated" };

  const sigCheck = await verifyMutationSignature(sig, wallet);
  if (!sigCheck.valid) return { success: false, error: sigCheck.error ?? "Signature invalid" };

  try {
    const client = getForsetyClient();
    const result = await handler(wallet, client);
    return { success: true, ...result } as MutationSuccess<T>;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Operation failed",
    };
  }
}
