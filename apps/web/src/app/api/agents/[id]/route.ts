import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { sanitizeAgent } from "@forsety/sdk";
import { apiError } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const { id } = await params;
    const client = getForsetyClient();
    const agent = await client.agents.getById(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const auditSummary = await client.agentAudit.getSummary(id);

    return NextResponse.json({ agent: sanitizeAgent(agent), auditSummary });
  } catch (error) {
    return apiError("Failed to get agent", error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const client = getForsetyClient();

    const existing = await client.agents.getById(id);
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (body.isActive === false) {
      await client.agents.deactivate(id);
      const updated = await client.agents.getById(id);
      return NextResponse.json({ agent: updated ? sanitizeAgent(updated) : null });
    }

    if (body.permissions || body.allowedDatasets) {
      const updated = await client.agents.updatePermissions(
        id,
        body.permissions ?? existing.permissions,
        body.allowedDatasets
      );
      return NextResponse.json({ agent: updated ? sanitizeAgent(updated) : null });
    }

    return NextResponse.json({ agent: sanitizeAgent(existing) });
  } catch (error) {
    return apiError("Failed to update agent", error);
  }
}
