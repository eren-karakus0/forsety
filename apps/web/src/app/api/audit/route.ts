import { NextRequest, NextResponse } from "next/server";
import { resolveAccessor, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const rawLimit = parseInt(url.searchParams.get("limit") ?? "100", 10);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 100, 1), 500);
    const rawOffset = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);

    const client = getForsetyClient();
    const logs = await client.agentAudit.listByOwner(auth.accessor, {
      agentId: agentId === "anonymous" ? null : agentId,
      status,
      limit,
      offset,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return apiError("Failed to get audit logs", error);
  }
}
