import { NextRequest, NextResponse } from "next/server";
import { resolveAccessor, validateAuth, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";
import { z } from "zod";

const VALID_OPERATION_TYPES = ["read", "download", "verify"] as const;

const accessQuerySchema = z.object({
  datasetId: z.string().uuid().optional(),
  accessorAddress: z.string().min(1).optional(),
  operationType: z.enum(VALID_OPERATION_TYPES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const isAuthed = await validateAuth(request);
  if (!isAuthed) return unauthorizedResponse();

  try {
    const url = new URL(request.url);
    const raw = {
      datasetId: url.searchParams.get("datasetId") || undefined,
      accessorAddress: url.searchParams.get("accessor") || undefined,
      operationType: url.searchParams.get("operationType") || undefined,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      limit: url.searchParams.has("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined,
      offset: url.searchParams.has("offset")
        ? Number(url.searchParams.get("offset"))
        : undefined,
    };

    const parsed = accessQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const filters = parsed.data;
    const client = getForsetyClient();
    const [data, total] = await Promise.all([
      client.access.listAll(filters),
      client.access.count(filters),
    ]);

    return NextResponse.json({
      data,
      pagination: { total, limit: filters.limit, offset: filters.offset },
    });
  } catch (error) {
    return apiError("Failed to query access logs", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { datasetId, operationType, agentId } = body;

    // accessorAddress comes from auth context, not from body
    const accessorAddress = auth.accessor;

    if (!datasetId || !operationType) {
      return NextResponse.json(
        {
          error: "Missing required fields: datasetId, operationType",
        },
        { status: 400 }
      );
    }

    if (!VALID_OPERATION_TYPES.includes(operationType)) {
      return NextResponse.json(
        {
          error: `Invalid operationType: must be one of ${VALID_OPERATION_TYPES.join(", ")}`,
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

    // Cross-reference audit log if agentId provided
    if (agentId) {
      await client.agentAudit.log({
        agentId,
        action: "dataset.access",
        resourceType: "dataset",
        resourceId: datasetId,
        input: { operationType, accessorAddress },
        output: { accessLogId: log.id },
      }).catch(() => {});
    }

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("Access denied") ? 403 : 500;
    return apiError("Failed to log access", error, status);
  }
}
