import { NextRequest, NextResponse } from "next/server";
import { resolveAccessor, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const generatedBy = (body as Record<string, string>).generatedBy;

    const client = getForsetyClient();

    // Verify dataset ownership
    const dataset = await client.datasets.getById(id);
    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }
    if (dataset.ownerAddress !== auth.accessor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await client.evidence.generatePack(id, generatedBy);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("not found") ? 404 : 500;
    return apiError("Failed to generate evidence pack", error, status);
  }
}
