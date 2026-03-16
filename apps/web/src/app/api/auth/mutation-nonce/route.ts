import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt, generateNonce } from "@forsety/auth";
import { createDb, sessions } from "@forsety/db";
import { getEnv } from "@/lib/env";

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

    const nonce = generateNonce();
    const walletAddress = payload.sub.toLowerCase();

    // Store nonce with short TTL (2 minutes) for mutation approval
    const db = createDb(env.DATABASE_URL);
    await db.insert(sessions).values({
      walletAddress,
      nonce,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });

    return NextResponse.json({ nonce });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate mutation nonce" },
      { status: 500 }
    );
  }
}
