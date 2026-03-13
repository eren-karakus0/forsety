import { NextRequest, NextResponse } from "next/server";
import { resolveAccessor, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

/**
 * Resolve license owner by looking up the parent dataset.
 * Returns the dataset ownerAddress or null if not found.
 */
async function getLicenseOwner(
  client: ReturnType<typeof getForsetyClient>,
  licenseId: string
): Promise<{ ownerAddress: string; license: NonNullable<Awaited<ReturnType<typeof client.licenses.getById>>> } | null> {
  const license = await client.licenses.getById(licenseId);
  if (!license) return null;

  const dataset = await client.datasets.getById(license.datasetId);
  if (!dataset) return null;

  return { ownerAddress: dataset.ownerAddress, license };
}

/**
 * GET /api/licenses/[id]
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

    const result = await getLicenseOwner(client, id);
    if (!result) {
      return NextResponse.json(
        { error: "License not found" },
        { status: 404 }
      );
    }

    if (result.ownerAddress !== auth.accessor) {
      return NextResponse.json(
        { error: "Forbidden: not dataset owner" },
        { status: 403 }
      );
    }

    return NextResponse.json(result.license);
  } catch (error) {
    return apiError("Failed to fetch license", error);
  }
}

/**
 * PATCH /api/licenses/[id] — update license (spdxType, terms).
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
    const { spdxType, terms } = body;

    if (!spdxType && terms === undefined) {
      return NextResponse.json(
        { error: "At least one of spdxType or terms is required" },
        { status: 400 }
      );
    }

    const client = getForsetyClient();

    // Authorization: caller must be dataset owner
    const result = await getLicenseOwner(client, id);
    if (!result) {
      return NextResponse.json(
        { error: "License not found" },
        { status: 404 }
      );
    }
    if (result.ownerAddress !== auth.accessor) {
      return NextResponse.json(
        { error: "Forbidden: only the dataset owner can update licenses" },
        { status: 403 }
      );
    }

    const updated = await client.licenses.update(id, { spdxType, terms });

    if (!updated) {
      return NextResponse.json(
        { error: "License not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("revoked")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return apiError("Failed to update license", error);
  }
}

/**
 * DELETE /api/licenses/[id] — revoke license (soft-delete).
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
    const result = await getLicenseOwner(client, id);
    if (!result) {
      return NextResponse.json(
        { error: "License not found" },
        { status: 404 }
      );
    }
    if (result.ownerAddress !== auth.accessor) {
      return NextResponse.json(
        { error: "Forbidden: only the dataset owner can revoke licenses" },
        { status: 403 }
      );
    }

    const revoked = await client.licenses.revoke(id);

    return NextResponse.json(revoked);
  } catch (error) {
    return apiError("Failed to revoke license", error);
  }
}
