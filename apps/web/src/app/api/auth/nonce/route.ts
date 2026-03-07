import { NextRequest, NextResponse } from "next/server";
import { createSiwaMessage, generateNonce } from "@forsety/auth";
import { createDb, sessions } from "@forsety/db";
import { getEnv } from "@/lib/env";

// In-memory rate limiter: max 10 nonce requests per IP per minute
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const address = request.nextUrl.searchParams.get("address");

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "Valid Ethereum address is required (?address=0x...)" },
      { status: 400 }
    );
  }

  const nonce = generateNonce();
  const host = request.headers.get("host") ?? "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") ?? "https";

  const message = createSiwaMessage({
    domain: host,
    address,
    nonce,
    uri: `${protocol}://${host}`,
  });

  // Persist nonce in sessions table (5 min expiry)
  const db = createDb(getEnv().DATABASE_URL);
  await db.insert(sessions).values({
    walletAddress: address.toLowerCase(),
    nonce,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  return NextResponse.json({ nonce, message });
}
