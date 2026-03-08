import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@forsety/auth";
import { getEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("forsety-auth")?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const env = getEnv();
    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      address: payload.sub,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
