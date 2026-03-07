import { NextRequest, NextResponse } from "next/server";
import { validateAuth, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";

const VALID_OPERATION_TYPES = ["read", "download", "verify"] as const;

export async function POST(request: NextRequest) {
  if (!(await validateAuth(request))) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { datasetId, accessorAddress, operationType, agentId } = body;

    if (!datasetId || !accessorAddress || !operationType) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: datasetId, accessorAddress, operationType",
        },
        { status: 400 }
      );
    }

    if (!VALID_OPERATION_TYPES.includes(operationType)) {
      return NextResponse.json(
        {
          error: `Invalid operationType: must be one of ${VALID_OPERATION_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const client = getForsetyClient();
    const log = await client.access.logAccess({
      datasetId,
      accessorAddress,
      operationType,
    });

    // Cross-reference audit log if agentId provided
    if (agentId) {
      await client.agentAudit.log({
        agentId,
        action: "dataset.access",
        resourceType: "dataset",
        resourceId: datasetId,
        input: { operationType, accessorAddress },
        output: { accessLogId: log.id },
      }).catch(() => {});
    }

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("Access denied") ? 403 : 500;
    return NextResponse.json(
      { error: "Failed to log access", details: message },
      { status }
    );
  }
}
