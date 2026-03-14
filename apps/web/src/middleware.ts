import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { checkRateLimit, getRateLimitTier, RATE_LIMIT_TIERS } from "@/lib/rate-limit";

const LANDING_DOMAIN = "forsety.xyz";
const APP_DOMAIN = "app.forsety.xyz";
const WWW_DOMAIN = "www.forsety.xyz";

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

function handleRateLimit(request: NextRequest, pathname: string): NextResponse {
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const bareHost = host.split(":")[0]?.toLowerCase() ?? "";

  // ── 1. www.forsety.xyz → 301 redirect to forsety.xyz ──
  if (bareHost === WWW_DOMAIN) {
    const url = new URL(`https://${LANDING_DOMAIN}${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url, 301);
  }

  // ── 2. forsety.xyz (landing domain) ──
  if (bareHost === LANDING_DOMAIN) {
    // API routes on landing — rate limit + pass through (auth APIs must work)
    if (pathname.startsWith("/api/")) {
      return handleRateLimit(request, pathname);
    }

    // Dashboard routes on landing → redirect to app subdomain
    if (pathname.startsWith("/dashboard")) {
      const url = new URL(`https://${APP_DOMAIN}${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url, 301);
    }

    // Everything else (landing pages, /verify/[token], etc.) → pass through
    return NextResponse.next();
  }

  // ── 3. app.forsety.xyz (app domain) ──
  if (bareHost === APP_DOMAIN) {
    // Root → redirect to dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL(`https://${APP_DOMAIN}/dashboard`), 301);
    }

    // API routes — rate limit + pass through
    if (pathname.startsWith("/api/")) {
      return handleRateLimit(request, pathname);
    }

    // Dashboard — JWT auth check
    if (pathname.startsWith("/dashboard")) {
      const token = request.cookies.get("forsety-auth")?.value;
      if (!token) {
        return NextResponse.redirect(new URL(`https://${LANDING_DOMAIN}`));
      }

      try {
        await jwtVerify(token, getJwtSecret());
        return NextResponse.next();
      } catch {
        const response = NextResponse.redirect(new URL(`https://${LANDING_DOMAIN}`));
        response.cookies.set("forsety-auth", "", { maxAge: 0, path: "/", domain: `.${LANDING_DOMAIN}` });
        return response;
      }
    }

    return NextResponse.next();
  }

  // ── 4. Other hosts (localhost, Vercel preview) → existing behavior ──

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    return handleRateLimit(request, pathname);
  }

  // Dashboard auth protection (development bypass)
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
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
