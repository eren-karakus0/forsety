import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { mode = "full", ttlHours = 24 } = body;

    if (!["full", "redacted"].includes(mode)) {
      return NextResponse.json(
        { error: "mode must be 'full' or 'redacted'" },
        { status: 400 }
      );
    }

    if (typeof ttlHours !== "number" || !Number.isInteger(ttlHours) || ttlHours < 1 || ttlHours > 720) {
      return NextResponse.json(
        { error: "ttlHours must be an integer between 1 and 720 (30 days)" },
        { status: 400 }
      );
    }

    const client = getForsetyClient();
    const link = await client.share.createShareLink({
      evidencePackId: id,
      mode,
      ttlHours,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forsety.vercel.app";

    return NextResponse.json(
      {
        token: link.token,
        url: `${baseUrl}/verify/${link.token}`,
        expiresAt: link.expiresAt.toISOString(),
        mode: link.mode,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create share link" },
      { status: 500 }
    );
  }
}
