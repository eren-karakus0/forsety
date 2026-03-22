import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt, generateNonce } from "@forsety/auth";
import { sessions } from "@forsety/db";
import { eq, and, gt, lt, sql } from "drizzle-orm";
import { getEnv } from "@/lib/env";
import { getDb } from "@/lib/db";

/** Maximum active (non-expired) mutation nonces per wallet */
const MAX_ACTIVE_NONCES = 3;

/** Mutation nonce TTL: 90 seconds */
const NONCE_TTL_MS = 90 * 1000;

/** Probabilistic cleanup: ~10% chance per request */
const CLEANUP_PROBABILITY = 0.1;

/** Global rate limit: max nonces per minute across all wallets */
const GLOBAL_MAX_PER_MINUTE = 100;
let globalNonceCount = 0;
let globalWindowStart = Date.now();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("forsety-auth")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const env = getEnv();
    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload?.sub) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const walletAddress = payload.sub.toLowerCase();
    const db = getDb();

    // Global rate limit: sliding window per minute
    const now = Date.now();
    if (now - globalWindowStart > 60_000) {
      globalNonceCount = 0;
      globalWindowStart = now;
    }
    if (globalNonceCount >= GLOBAL_MAX_PER_MINUTE) {
      return NextResponse.json(
        { error: "System is busy. Please try again shortly." },
        { status: 429 }
      );
    }
    globalNonceCount++;

    // Enforce per-wallet nonce limit to prevent flooding
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(sessions)
      .where(
        and(
          eq(sessions.walletAddress, walletAddress),
          gt(sessions.expiresAt, new Date())
        )
      );

    if (count >= MAX_ACTIVE_NONCES) {
      return NextResponse.json(
        { error: "Too many pending approvals. Please complete or wait for existing ones to expire." },
        { status: 429 }
      );
    }

    const nonce = generateNonce();

    // Store nonce with short TTL for mutation approval
    await db.insert(sessions).values({
      walletAddress,
      nonce,
      expiresAt: new Date(Date.now() + NONCE_TTL_MS),
    });

    // Probabilistic cleanup: ~10% chance, global expired session purge
    if (Math.random() < CLEANUP_PROBABILITY) {
      db.delete(sessions)
        .where(lt(sessions.expiresAt, new Date()))
        .execute()
        .catch(() => {});
    }

    return NextResponse.json({ nonce });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate mutation nonce" },
      { status: 500 }
    );
  }
}
