import { NextRequest, NextResponse } from "next/server";
import { validateAuth, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateAuth(request))) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const generatedBy = (body as Record<string, string>).generatedBy;

    const client = getForsetyClient();
    const result = await client.evidence.generatePack(id, generatedBy);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: "Failed to generate evidence pack", details: message },
      { status }
    );
  }
}
