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

    // Verify ownership: evidence → dataset → owner
    const pack = await client.evidence.getById(id);
    if (!pack) {
      return NextResponse.json({ error: "Evidence pack not found" }, { status: 404 });
    }
    const dataset = await client.datasets.getById(pack.datasetId);
    if (!dataset || dataset.ownerAddress !== auth.accessor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const link = await client.share.createShareLink({
      evidencePackId: id,
      mode,
      ttlHours,
    });

    const landingDomain = process.env.NEXT_PUBLIC_LANDING_DOMAIN;
    const baseUrl = landingDomain
      ? `https://${landingDomain}`
      : process.env.NEXT_PUBLIC_APP_URL || "https://forsety.xyz";

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
    return apiError("Failed to create share link", error);
  }
}
