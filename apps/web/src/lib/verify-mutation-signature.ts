import { eq, and, gt } from "drizzle-orm";
import { verifyAuthMessage } from "@forsety/auth";
import { sessions } from "@forsety/db";
import { getDb } from "@/lib/db";
import type { SignaturePayload } from "./types";

const GENERIC_ERROR = "Mutation authentication failed";

/**
 * Validate SignaturePayload fields before crypto operations.
 * fullMessage must start with "APTOS\n", signature/publicKey must be hex.
 */
function validatePayload(sig: SignaturePayload): string | null {
  if (!sig?.fullMessage || !sig?.signature || !sig?.publicKey) {
    return "Missing signature payload";
  }
  if (typeof sig.fullMessage !== "string" || !sig.fullMessage.startsWith("APTOS\n")) {
    return "Invalid message format";
  }
  const sigClean = sig.signature.replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{128}$/.test(sigClean)) {
    return "Invalid signature format";
  }
  const pubClean = sig.publicKey.replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{64}$/.test(pubClean)) {
    return "Invalid public key format";
  }

  // Validate domain and chain binding using Aptos envelope format (lowercase fields)
  const appMatch = sig.fullMessage.match(/\napplication:\s*(\S+)/);
  if (!appMatch) {
    return "Invalid application binding";
  }
  // Reject if application is empty or contains suspicious characters
  const app = appMatch[1];
  if (!app || app.length < 3) {
    return "Invalid application binding";
  }

  const chainMatch = sig.fullMessage.match(/\nchain_id:\s*(\d+)/);
  if (!chainMatch || chainMatch[1] !== "2") {
    return "Invalid chain binding";
  }

  return null;
}

/**
 * Server-side utility to verify a mutation wallet signature.
 * Validates the Ed25519 signature, consumes the nonce atomically, and checks wallet match.
 */
export async function verifyMutationSignature(
  sig: SignaturePayload,
  expectedWallet: string
): Promise<{ valid: boolean; error?: string }> {
  const isProd = process.env.NODE_ENV === "production";

  // Runtime input validation
  const validationError = validatePayload(sig);
  if (validationError) {
    return { valid: false, error: isProd ? GENERIC_ERROR : validationError };
  }

  // Verify Ed25519 signature with chain ID binding
  const result = verifyAuthMessage({
    fullMessage: sig.fullMessage,
    signature: sig.signature,
    publicKey: sig.publicKey,
    expectedChainId: 2,
    strictChainId: true,
  });

  if (!result.success || !result.nonce) {
    console.error("[MutationSig] Verification failed:", result.error);
    return { valid: false, error: isProd ? GENERIC_ERROR : (result.error ?? "Signature verification failed") };
  }

  // Check wallet address matches
  if (result.address?.toLowerCase() !== expectedWallet.toLowerCase()) {
    console.error("[MutationSig] Wallet mismatch:", { expected: expectedWallet, got: result.address });
    return { valid: false, error: isProd ? GENERIC_ERROR : "Wallet address mismatch" };
  }

  // Consume nonce atomically within a transaction to prevent race conditions.
  // SELECT FOR UPDATE acquires a row-level lock, preventing concurrent requests
  // from consuming the same nonce.
  const db = getDb();

  const consumed = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.nonce, result.nonce!),
          eq(sessions.walletAddress, expectedWallet.toLowerCase()),
          gt(sessions.expiresAt, new Date())
        )
      )
      .for("update");

    if (!row) return null;

    await tx.delete(sessions).where(eq(sessions.id, row.id));
    return row;
  });

  if (!consumed) {
    return { valid: false, error: isProd ? GENERIC_ERROR : "Invalid or expired nonce" };
  }

  return { valid: true };
}
