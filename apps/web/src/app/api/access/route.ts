import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { datasetId, accessorAddress, operationType } = body;

    if (!datasetId || !accessorAddress || !operationType) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: datasetId, accessorAddress, operationType",
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
