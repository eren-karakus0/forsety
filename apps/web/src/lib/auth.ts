import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@forsety/auth";
import { getEnv } from "./env";

/**
 * Dual auth: accepts JWT cookie (dashboard) OR API key header (programmatic).
 */
export function validateApiKey(request: NextRequest): boolean {
  // 1. Check API key header (programmatic access)
  const apiKey =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (apiKey && apiKey === getEnv().FORSETY_API_KEY) {
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
 * Check either API key or JWT — returns true if any auth method is valid.
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
