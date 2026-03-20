import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { verifyJwt } from "@forsety/auth";
import { getEnv } from "./env";
import { getForsetyClient } from "./forsety";

function safeCompare(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(maxLen);
  const bufB = Buffer.alloc(maxLen);
  bufA.write(a);
  bufB.write(b);
  return a.length === b.length && timingSafeEqual(bufA, bufB);
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
): Promise<{
  accessor: string;
  trusted: boolean;
  agentId?: string;
  agentPermissions?: string[];
  agentAllowedDatasets?: string[];
} | null> {
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
    return {
      accessor: agent.ownerAddress,
      trusted: true,
      agentId: agent.id,
      agentPermissions: agent.permissions ?? [],
      agentAllowedDatasets: agent.allowedDatasets ?? [],
    };
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

/**
 * Strict accessor resolution for mutation routes.
 * Rejects untrusted (global API key) access to prevent accessor spoofing.
 */
export async function resolveAccessorStrict(
  request: NextRequest
): Promise<{ accessor: string; trusted: boolean } | null> {
  const auth = await resolveAccessor(request);
  if (!auth) return null;
  if (!auth.trusted) return null;
  return auth;
}

/**
 * Check if agent auth context has required permission and dataset scope.
 * Passes through for non-agent (wallet) auth.
 */
export function checkAgentScope(
  auth: { agentId?: string; agentPermissions?: string[]; agentAllowedDatasets?: string[] },
  requiredPermission: string,
  datasetId?: string
): { allowed: boolean; error?: string } {
  if (!auth.agentId) return { allowed: true }; // wallet auth, no agent restrictions

  if (auth.agentPermissions && !auth.agentPermissions.includes(requiredPermission)) {
    return { allowed: false, error: `Agent lacks permission: ${requiredPermission}` };
  }

  if (datasetId && auth.agentAllowedDatasets?.length && !auth.agentAllowedDatasets.includes(datasetId)) {
    return { allowed: false, error: "Agent not authorized for this dataset" };
  }

  return { allowed: true };
}

/**
 * DRY helper: fetch dataset + verify ownership. Returns dataset or error response.
 */
export async function requireDatasetOwner(
  client: { datasets: { getById(id: string): Promise<{ ownerAddress: string } | null> } },
  datasetId: string,
  accessor: string
): Promise<
  | { dataset: { ownerAddress: string }; error?: never }
  | { error: NextResponse; dataset?: never }
> {
  const dataset = await client.datasets.getById(datasetId);
  if (!dataset) {
    return { error: NextResponse.json({ error: "Dataset not found" }, { status: 404 }) };
  }
  if (dataset.ownerAddress !== accessor) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { dataset };
}
