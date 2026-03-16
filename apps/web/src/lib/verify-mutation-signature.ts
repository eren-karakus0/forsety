import { eq, and, gt } from "drizzle-orm";
import { verifyAuthMessage } from "@forsety/auth";
import { createDb, sessions } from "@forsety/db";
import { getEnv } from "@/lib/env";
import type { SignaturePayload } from "./types";

/**
 * Server-side utility to verify a mutation wallet signature.
 * Validates the Ed25519 signature, consumes the nonce, and checks wallet match.
 */
export async function verifyMutationSignature(
  sig: SignaturePayload,
  expectedWallet: string
): Promise<{ valid: boolean; error?: string }> {
  if (!sig?.fullMessage || !sig?.signature || !sig?.publicKey) {
    return { valid: false, error: "Missing signature payload" };
  }

  // Verify Ed25519 signature
  const result = verifyAuthMessage({
    fullMessage: sig.fullMessage,
    signature: sig.signature,
    publicKey: sig.publicKey,
  });

  if (!result.success || !result.nonce) {
    return { valid: false, error: result.error ?? "Signature verification failed" };
  }

  // Check wallet address matches
  if (result.address?.toLowerCase() !== expectedWallet.toLowerCase()) {
    return { valid: false, error: "Wallet address mismatch" };
  }

  // Consume nonce atomically
  const env = getEnv();
  const db = createDb(env.DATABASE_URL);
  const [consumed] = await db
    .delete(sessions)
    .where(
      and(
        eq(sessions.nonce, result.nonce),
        eq(sessions.walletAddress, expectedWallet.toLowerCase()),
        gt(sessions.expiresAt, new Date())
      )
    )
    .returning();

  if (!consumed) {
    return { valid: false, error: "Invalid or expired nonce" };
  }

  return { valid: true };
}
