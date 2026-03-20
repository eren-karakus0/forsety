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

  // Validate action and domain binding in full message
  if (!sig.fullMessage.includes("Application: Forsety")) {
    return "Invalid application binding";
  }
  if (!sig.fullMessage.includes("Chain Id: 2")) {
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

  // Verify Ed25519 signature
  const result = verifyAuthMessage({
    fullMessage: sig.fullMessage,
    signature: sig.signature,
    publicKey: sig.publicKey,
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
