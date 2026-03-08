import { NextRequest, NextResponse } from "next/server";
import { createAuthMessage, generateNonce } from "@forsety/auth";
import { createDb, sessions } from "@forsety/db";
import { getEnv } from "@/lib/env";

// Rate limiter: composite key (address + IP) to resist header spoofing.
// Also limits per-address to prevent nonce flooding for a single wallet.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_KEY = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = Date.now();

function checkRateLimit(key: string): boolean {
  const now = Date.now();

  // Periodic cleanup of stale entries (every 5 min)
  if (now - lastCleanup > 5 * 60_000) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
    lastCleanup = now;
  }

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_PER_KEY) return false;
  entry.count++;
  return true;
}

function getClientIp(request: NextRequest): string {
  // In production behind a trusted reverse proxy, the rightmost
  // x-forwarded-for entry added by the proxy is the most reliable.
  // For direct connections, fall back to x-real-ip or "unknown".
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim());
    // Use last entry (added by closest trusted proxy) if multiple
    return parts[parts.length - 1] ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address || !/^0x[a-fA-F0-9]{1,64}$/.test(address)) {
    return NextResponse.json(
      { error: "Valid Aptos address is required (?address=0x...)" },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const addrLower = address.toLowerCase();

  // Rate limit on both dimensions: per-address and per-IP
  if (!checkRateLimit(`addr:${addrLower}`) || !checkRateLimit(`ip:${ip}`)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const env = getEnv();
  const nonce = generateNonce();
  const host = request.headers.get("host") ?? "localhost:3000";

  const message = createAuthMessage({
    domain: host,
    address,
    nonce,
    uri: `https://${host}`,
  });

  // Persist nonce in sessions table (5 min expiry)
  const db = createDb(env.DATABASE_URL);
  await db.insert(sessions).values({
    walletAddress: addrLower,
    nonce,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  return NextResponse.json({ nonce, message });
}
