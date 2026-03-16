import { NextRequest, NextResponse } from "next/server";
import { resolveAccessor, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

/**
 * POST /api/agents/[id]/rotate-key — rotate an agent's API key.
 * Returns the new plaintext key (shown once only).
 * Requires: caller must be agent owner.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const client = getForsetyClient();

    const agent = await client.agents.getById(id);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    if (agent.ownerAddress !== auth.accessor) {
      return NextResponse.json(
        { error: "Forbidden: only the agent owner can rotate keys" },
        { status: 403 }
      );
    }

    const result = await client.agents.rotateApiKey(id);
    if (!result) {
      return NextResponse.json(
        { error: "Failed to rotate key" },
        { status: 500 }
      );
    }

    // Audit log
    await client.agentAudit
      .log({
        agentId: id,
        action: "agent.key_rotated",
        resourceType: "agent",
        resourceId: id,
        status: "success",
      })
      .catch((err) => {
        console.error(`[forsety] audit log for key rotation agent=${id} failed:`, err);
      });

    return NextResponse.json({
      apiKey: result.apiKey,
      warning: "Store this API key securely. It will not be shown again.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("inactive")) {
      return NextResponse.json({ error: "Cannot rotate key for inactive agent" }, { status: 400 });
    }
    return apiError("Failed to rotate agent key", error);
  }
}
