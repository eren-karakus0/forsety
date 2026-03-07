import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { verifySiwaMessage, signJwt } from "@forsety/auth";
import { createDb, sessions, users } from "@forsety/db";
import { getEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Missing message or signature" },
        { status: 400 }
      );
    }

    // Verify SIWA signature
    const result = await verifySiwaMessage({ message, signature });

    if (!result.success || !result.address || !result.nonce) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 401 }
      );
    }

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    const walletAddress = result.address.toLowerCase();

    // Validate nonce from DB: must exist, not expired, match address
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.nonce, result.nonce),
          eq(sessions.walletAddress, walletAddress),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 401 }
      );
    }

    // Delete nonce — one-time use (prevent replay)
    await db.delete(sessions).where(eq(sessions.id, session.id));

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
