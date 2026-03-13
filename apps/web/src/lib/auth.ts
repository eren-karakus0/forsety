import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { verifyJwt } from "@forsety/auth";
import { getEnv } from "./env";
import { getForsetyClient } from "./forsety";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Dual auth: accepts JWT cookie (dashboard) OR API key header (programmatic).
 */
export function validateApiKey(request: NextRequest): boolean {
  // 1. Check API key header (programmatic access)
  const apiKey =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (apiKey && safeCompare(apiKey, getEnv().FORSETY_API_KEY)) {
    return true;
  }

  return false;
}

/**
 * Validate JWT cookie from SIWA auth flow.
 */
export async function validateJwtCookie(
  request: NextRequest
): Promise<string | null> {
  const token = request.cookies.get("forsety-auth")?.value;
  if (!token) return null;

  const payload = await verifyJwt(token, getEnv().JWT_SECRET);
  return payload?.sub ?? null;
}

/**
 * Check either API key or JWT - returns true if any auth method is valid.
 */
export async function validateAuth(request: NextRequest): Promise<boolean> {
  if (validateApiKey(request)) return true;
  const wallet = await validateJwtCookie(request);
  return wallet !== null;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized", message: "Invalid or missing API key" },
    { status: 401 }
  );
}

/**
 * Resolve accessor address from auth context.
 * JWT: wallet address from token (trusted)
 * API key + fsy_ prefix: agent's ownerAddress from DB (trusted)
 * API key (global): accessor query param (backward-compat, logged as untrusted)
 */
export async function resolveAccessor(
  request: NextRequest
): Promise<{ accessor: string; trusted: boolean } | null> {
  // 1. JWT cookie → wallet address (always trusted)
  const wallet = await validateJwtCookie(request);
  if (wallet) return { accessor: wallet, trusted: true };

  // 2. API key
  const apiKey =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!apiKey) return null;

  // 2a. Agent API key (fsy_ prefix) → ownerAddress from DB
  if (apiKey.startsWith("fsy_")) {
    const client = getForsetyClient();
    const agent = await client.agents.authenticate(apiKey);
    if (!agent) return null;
    return { accessor: agent.ownerAddress, trusted: true };
  }

  // 2b. Global API key → accessor from query param (backward-compat)
  if (safeCompare(apiKey, getEnv().FORSETY_API_KEY)) {
    const url = new URL(request.url);
    const accessor = url.searchParams.get("accessor");
    if (!accessor) return null;
    return { accessor, trusted: false };
  }

  return null;
}
