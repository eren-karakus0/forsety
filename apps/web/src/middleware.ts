import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { checkRateLimit, getRateLimitTier, RATE_LIMIT_TIERS } from "@/lib/rate-limit";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET environment variable is required (min 32 chars)");
  }
  return new TextEncoder().encode(secret);
}

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim());
    return parts[0] ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(request);
    const tier = getRateLimitTier(pathname, request.method);
    const config = RATE_LIMIT_TIERS[tier];
    const result = checkRateLimit(tier, ip, config);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return response;
  }

  // Dashboard auth protection
  if (pathname.startsWith("/dashboard")) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.next();
    }

    const token = request.cookies.get("forsety-auth")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    try {
      await jwtVerify(token, getJwtSecret());
      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.set("forsety-auth", "", { maxAge: 0, path: "/" });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
