import { NextRequest, NextResponse } from "next/server";
import { resolveAccessor, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const client = getForsetyClient();
    const result = await client.datasets.getWithLicense(id);

    if (!result) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }

    if (result.dataset.ownerAddress !== auth.accessor) {
      return NextResponse.json(
        { error: "Forbidden: not dataset owner" },
        { status: 403 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return apiError("Failed to fetch dataset", error);
  }
}

/**
 * PATCH /api/datasets/[id] — restore an archived dataset.
 * Body: { action: "restore" }
 * Requires: caller must be dataset owner.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action !== "restore") {
      return NextResponse.json(
        { error: "Invalid action. Supported: restore" },
        { status: 400 }
      );
    }

    const client = getForsetyClient();

    // Authorization: caller must be dataset owner
    const dataset = await client.datasets.getById(id);
    if (!dataset) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }
    if (dataset.ownerAddress !== auth.accessor) {
      return NextResponse.json(
        { error: "Forbidden: only the dataset owner can restore" },
        { status: 403 }
      );
    }

    const restored = await client.datasets.restore(id);

    return NextResponse.json(restored);
  } catch (error) {
    return apiError("Failed to restore dataset", error);
  }
}

/**
 * DELETE /api/datasets/[id] — archive a dataset (soft-delete).
 * Requires: caller must be dataset owner.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const client = getForsetyClient();

    // Authorization: caller must be dataset owner
    const dataset = await client.datasets.getById(id);
    if (!dataset) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }
    if (dataset.ownerAddress !== auth.accessor) {
      return NextResponse.json(
        { error: "Forbidden: only the dataset owner can archive" },
        { status: 403 }
      );
    }

    const archived = await client.datasets.archive(id);

    return NextResponse.json(archived);
  } catch (error) {
    return apiError("Failed to archive dataset", error);
  }
}
