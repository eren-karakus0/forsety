import { NextRequest, NextResponse } from "next/server";
import { resolveAccessor, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const client = getForsetyClient();

    // Verify the agent belongs to the caller
    const agent = await client.agents.getById(id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.ownerAddress !== auth.accessor) {
      return NextResponse.json(
        { error: "Forbidden: not agent owner" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const rawLimit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 500);
    const rawOffset = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);

    const logs = await client.agentAudit.getByAgent(id, {
      action,
      status,
      limit,
      offset,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return apiError("Failed to get audit logs", error);
  }
}
