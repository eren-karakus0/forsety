import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { verifyAuthMessage, signJwt } from "@forsety/auth";
import { createDb, sessions, users } from "@forsety/db";
import { getEnv } from "@/lib/env";
import { SHELBYNET_CHAIN_ID, APTOS_NETWORK } from "@/lib/aptos-config";

export async function POST(request: NextRequest) {
  try {
    const { fullMessage, signature, publicKey, address } = await request.json();

    if (!fullMessage || !signature || !publicKey) {
      return NextResponse.json(
        { error: "Missing fullMessage, signature, or publicKey" },
        { status: 400 }
      );
    }

    // Verify Aptos signature with domain + chain ID binding
    const host = request.headers.get("host") ?? "localhost:3000";
    const result = verifyAuthMessage({
      fullMessage,
      signature,
      publicKey,
      expectedAddress: address,
      expectedDomain: host,
      expectedChainId: APTOS_NETWORK === "shelbynet" ? SHELBYNET_CHAIN_ID : undefined,
    });

    if (!result.success || !result.address || !result.nonce) {
      return NextResponse.json(
        { error: result.error ?? "Verification failed" },
        { status: 401 }
      );
    }

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    const walletAddress = result.address.toLowerCase();

    // Atomic nonce consumption: delete + return in single query (prevents race condition)
    const [consumed] = await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.nonce, result.nonce),
          eq(sessions.walletAddress, walletAddress),
          gt(sessions.expiresAt, new Date())
        )
      )
      .returning();

    if (!consumed) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 401 }
      );
    }

    // Upsert user record
    await db
      .insert(users)
      .values({ walletAddress, lastLoginAt: new Date() })
      .onConflictDoUpdate({
        target: users.walletAddress,
        set: { lastLoginAt: new Date() },
      });

    // Sign JWT
    const token = await signJwt(result.address, env.JWT_SECRET, {
      expiresIn: "1h",
      nonce: result.nonce,
    });

    // Set httpOnly cookie
    const response = NextResponse.json({
      success: true,
      address: result.address,
    });

    response.cookies.set("forsety-auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
