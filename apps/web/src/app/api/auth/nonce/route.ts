import { NextRequest, NextResponse } from "next/server";
import { createSiwaMessage, generateNonce } from "@forsety/auth";
import { createDb, sessions } from "@forsety/db";
import { getEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
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
