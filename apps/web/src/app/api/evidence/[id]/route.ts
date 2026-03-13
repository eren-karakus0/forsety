import { NextRequest, NextResponse } from "next/server";
import { resolveAccessor, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

/**
 * GET /api/evidence/[id] — get evidence pack detail (owner-scoped).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const client = getForsetyClient();
    const pack = await client.evidence.getById(id);

    if (!pack) {
      return NextResponse.json(
        { error: "Evidence pack not found" },
        { status: 404 }
      );
    }

    // Verify ownership via dataset
    const dataset = await client.datasets.getById(pack.datasetId);
    if (!dataset || dataset.ownerAddress !== auth.accessor) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: pack });
  } catch (error) {
    return apiError("Failed to fetch evidence pack", error);
  }
}
