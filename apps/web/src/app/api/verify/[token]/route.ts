import { NextRequest, NextResponse } from "next/server";
import { getForsetyClient } from "@/lib/forsety";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const client = getForsetyClient();
    const result = await client.share.resolveShareLink(token);

    if (!result) {
      return NextResponse.json(
        { error: "Link expired or not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mode: result.link.mode,
      expiresAt: result.link.expiresAt.toISOString(),
      pack: {
        packJson: result.pack.packJson,
        packJsonCanonical: result.pack.packJsonCanonical ?? null,
        packHash: result.pack.packHash,
        generatedAt: result.pack.generatedAt.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}
