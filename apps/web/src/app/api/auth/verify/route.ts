import { NextRequest, NextResponse } from "next/server";
import { verifySiwaMessage, signJwt } from "@forsety/auth";

const JWT_SECRET = process.env.JWT_SECRET ?? "forsety-dev-secret-change-in-production-32ch";

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

    if (!result.success || !result.address) {
      return NextResponse.json(
        { error: result.error ?? "Verification failed" },
        { status: 401 }
      );
    }

    // Sign JWT
    const token = await signJwt(result.address, JWT_SECRET, {
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
      maxAge: 3600, // 1 hour
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}
