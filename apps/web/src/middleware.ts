import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { checkRateLimit, getRateLimitTier, RATE_LIMIT_TIERS } from "@/lib/rate-limit";

const LANDING_DOMAIN = "forsety.xyz";
const APP_DOMAIN = "app.forsety.xyz";
const WWW_DOMAIN = "www.forsety.xyz";

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  // Edge-safe: use btoa instead of Buffer.from
  return btoa(String.fromCharCode(...array));
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://cloud.umami.is https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://api.testnet.shelby.xyz https://fullnode.testnet.aptoslabs.com https://api.testnet.aptoslabs.com https://*.sentry.io https://cloud.umami.is https://va.vercel-scripts.com https://vitals.vercel-insights.com",
    "frame-src 'self' https://*.petra.app https://*.pontem.network https://accounts.google.com https://appleid.apple.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/**
 * Apply CSP + nonce to response headers (for browser enforcement)
 * and propagate nonce via request headers (for server components via headers()).
 */
function withSecurityHeaders(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-nonce", nonce);
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  return response;
}

/**
 * Apply CSP headers to JSON error responses (429, etc.)
 */
function applyCspToJsonResponse(response: NextResponse): NextResponse {
  const nonce = generateNonce();
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  return response;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET environment variable is required (min 32 chars)");
  }
  return new TextEncoder().encode(secret);
}

async function validateDashboardAuth(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get("forsety-auth")?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      if (payload.network && payload.network !== "testnet") {
        const redirectResponse = NextResponse.redirect(new URL("/", request.url));
        const cookieDomain = process.env.COOKIE_DOMAIN;
        redirectResponse.cookies.set("forsety-auth", "", { maxAge: 0, path: "/", ...(cookieDomain ? { domain: cookieDomain } : {}) });
        return redirectResponse;
      }
    } catch {
      const response = withSecurityHeaders(request);
      const cookieDomain = process.env.COOKIE_DOMAIN;
      response.cookies.set("forsety-auth", "", { maxAge: 0, path: "/", ...(cookieDomain ? { domain: cookieDomain } : {}) });
      return response;
    }
  }
  return withSecurityHeaders(request);
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
    const response = NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
    return applyCspToJsonResponse(response);
  }

  const response = withSecurityHeaders(request);
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
    return withSecurityHeaders(request);
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

    // Dashboard — allow guest access, validate existing tokens
    if (pathname.startsWith("/dashboard")) {
      return validateDashboardAuth(request);
    }

    return withSecurityHeaders(request);
  }

  // ── 4. Other hosts (localhost, Vercel preview) → existing behavior ──

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    return handleRateLimit(request, pathname);
  }

  // Dashboard — allow guest access, validate existing tokens
  if (pathname.startsWith("/dashboard")) {
    return validateDashboardAuth(request);
  }

  return withSecurityHeaders(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
