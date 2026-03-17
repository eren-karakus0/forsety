import { NextRequest, NextResponse } from "next/server";
import { createAuthMessage, generateNonce } from "@forsety/auth";
import { lt } from "drizzle-orm";
import { sessions } from "@forsety/db";
import { getDb } from "@/lib/db";
import * as Sentry from "@sentry/nextjs";

// Deterministic session cleanup interval (60 seconds)
const SESSION_CLEANUP_INTERVAL_MS = 60_000;
let lastSessionCleanup = 0;

// Address-based rate limiter: prevents nonce flooding for a single wallet.
// IP-based rate limiting is handled by the middleware.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_ADDR = 5;
const addrLimitMap = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = Date.now();

function checkAddrRateLimit(address: string): boolean {
  const now = Date.now();

  if (now - lastCleanup > 5 * 60_000) {
    for (const [k, v] of addrLimitMap) {
      if (now > v.resetAt) addrLimitMap.delete(k);
    }
    lastCleanup = now;
  }

  const entry = addrLimitMap.get(address);

  if (!entry || now > entry.resetAt) {
    addrLimitMap.set(address, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_PER_ADDR) return false;
  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address");

    if (!address || !/^0x[a-fA-F0-9]{1,64}$/.test(address)) {
      return NextResponse.json(
        { error: "Valid Aptos address is required (?address=0x...)" },
        { status: 400 }
      );
    }

    const addrLower = address.toLowerCase();

    if (!checkAddrRateLimit(addrLower)) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    const nonce = generateNonce();
    const host = request.headers.get("host") ?? "localhost:3000";

    const message = createAuthMessage({
      domain: host,
      address,
      nonce,
      uri: `https://${host}`,
    });

    // Persist nonce in sessions table (5 min expiry)
    const db = getDb();
    await db.insert(sessions).values({
      walletAddress: addrLower,
      nonce,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Deterministic cleanup: purge expired sessions at most once per 60s
    if (Date.now() - lastSessionCleanup > SESSION_CLEANUP_INTERVAL_MS) {
      lastSessionCleanup = Date.now();
      await db.delete(sessions)
        .where(lt(sessions.expiresAt, new Date()))
        .execute();
    }

    return NextResponse.json({ nonce, message });
  } catch (error) {
    console.error("[Auth Nonce] Error:", error);
    Sentry.captureException(error, { extra: { route: "/api/auth/nonce" } });
    return NextResponse.json(
      { error: "Failed to generate nonce" },
      { status: 500 }
    );
  }
}
