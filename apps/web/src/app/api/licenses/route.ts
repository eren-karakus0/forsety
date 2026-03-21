import { NextRequest, NextResponse } from "next/server";
import { resolveAccessor, resolveAccessorStrict, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError, validationError } from "@/lib/api-error";
import { z } from "zod";

const attachLicenseSchema = z.object({
  datasetId: z.string().uuid(),
  spdxType: z.string().min(1),
  grantorAddress: z.string().min(1).optional(),
  terms: z.record(z.unknown()).optional(),
});

const listQuerySchema = z.object({
  datasetId: z.string().uuid().optional(),
  includeRevoked: z.boolean().default(false),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
});

/**
 * GET /api/licenses?datasetId=...&includeRevoked=true&limit=50&offset=0
 */
export async function GET(request: NextRequest) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const url = new URL(request.url);
    const raw = {
      datasetId: url.searchParams.get("datasetId") || undefined,
      includeRevoked: url.searchParams.get("includeRevoked") === "true",
      limit: url.searchParams.has("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined,
      offset: url.searchParams.has("offset")
        ? Number(url.searchParams.get("offset"))
        : undefined,
    };

    const parsed = listQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const client = getForsetyClient();
    const data = await client.licenses.listByOwner(auth.accessor, parsed.data);

    return NextResponse.json({ data });
  } catch (error) {
    return apiError("Failed to list licenses", error);
  }
}

/**
 * POST /api/licenses — attach a new license to a dataset.
 * Requires: caller must be dataset owner.
 * termsHash is always server-computed (never client-supplied).
 */
export async function POST(request: NextRequest) {
  const auth = await resolveAccessorStrict(request);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = attachLicenseSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }
    const { datasetId, spdxType, grantorAddress, terms } = parsed.data;

    const client = getForsetyClient();

    // Authorization: caller must be dataset owner
    const dataset = await client.datasets.getById(datasetId);
    if (!dataset) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }
    if (dataset.ownerAddress !== auth.accessor) {
      return NextResponse.json(
        { error: "Forbidden: only the dataset owner can attach licenses" },
        { status: 403 }
      );
    }

    // termsHash intentionally omitted — always computed server-side by SDK
    const license = await client.licenses.attach({
      datasetId,
      spdxType,
      grantorAddress: grantorAddress ?? auth.accessor,
      terms,
    });

    return NextResponse.json(license, { status: 201 });
  } catch (error) {
    return apiError("Failed to attach license", error);
  }
}
