import { NextRequest, NextResponse } from "next/server";
import { createReadStream, unlinkSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { resolveAccessorStrict, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";
import { ForsetyAuthError } from "@forsety/sdk";

/** Maximum allowed download size: 100 MB */
const MAX_DOWNLOAD_SIZE = 100 * 1024 * 1024;

interface PreflightResult {
  accessor: string;
  dataset: {
    id: string;
    name: string;
    shelbyBlobName: string;
    blobHash: string | null;
  };
}

/** Shared auth + policy preflight. Returns accessor + dataset or error response. */
async function preflight(
  request: NextRequest,
  id: string
): Promise<PreflightResult | NextResponse> {
  const auth = await resolveAccessorStrict(request);
  if (!auth) return unauthorizedResponse();
  const accessorAddress = auth.accessor;

  const client = getForsetyClient();

  // Dataset existence + blob check
  const dataset = await client.datasets.getById(id);
  if (!dataset || !dataset.shelbyBlobName) {
    return NextResponse.json(
      { error: "Dataset not found or not available for download" },
      { status: 404 }
    );
  }

  // Pre-check size from DB before downloading (avoid wasted bandwidth)
  if (dataset.sizeBytes && dataset.sizeBytes > MAX_DOWNLOAD_SIZE) {
    return NextResponse.json(
      { error: "File exceeds maximum download size (100 MB)" },
      { status: 413 }
    );
  }

  // Policy check (read-only, no quota consumed)
  const { allowed } = await client.policies.checkAccess(id, accessorAddress);
  if (!allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return {
    accessor: accessorAddress,
    dataset: {
      id: dataset.id,
      name: dataset.name,
      shelbyBlobName: dataset.shelbyBlobName,
      blobHash: dataset.blobHash,
    },
  };
}

/**
 * HEAD — preflight check (auth + policy) without downloading.
 * Used by the frontend to validate before triggering native browser download.
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await preflight(request, id);
    if (result instanceof NextResponse) return result;
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return apiError("Preflight check failed", error);
  }
}

/**
 * GET — download dataset with policy enforcement.
 * Flow: auth → policy check → Shelby download → log access (quota) → stream to client.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let tempPath: string | null = null;

  try {
    const { id } = await params;
    const result = await preflight(request, id);
    if (result instanceof NextResponse) return result;

    const { accessor, dataset } = result;
    const client = getForsetyClient();
    const safeName = dataset.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    // --- Phase 2: Download from Shelby to temp file ---
    const downloadDir = join(tmpdir(), "forsety-downloads");
    mkdirSync(downloadDir, { recursive: true });
    tempPath = join(downloadDir, `${randomUUID()}-${safeName}`);

    await client.getShelby().downloadDataset(dataset.shelbyBlobName, tempPath);

    const fileSize = statSync(tempPath).size;

    // Enforce download size limit
    if (fileSize > MAX_DOWNLOAD_SIZE) {
      try { unlinkSync(tempPath); } catch { /* best-effort */ }
      tempPath = null;
      return NextResponse.json(
        { error: "File exceeds maximum download size (100 MB)" },
        { status: 413 }
      );
    }

    // --- Phase 3: Log access + consume quota (only after successful download) ---
    const accessLog = await client.access.logAccess({
      datasetId: id,
      accessorAddress: accessor,
      operationType: "download",
    });

    // --- Stream response (no full-file RAM buffering) ---
    const nodeStream = createReadStream(tempPath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    // Clean up temp file after stream ends or errors
    const pathToClean = tempPath;
    nodeStream.on("close", () => {
      try { unlinkSync(pathToClean); } catch { /* best-effort */ }
    });
    tempPath = null; // Prevent double-cleanup in catch block

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}"`,
        "Content-Length": String(fileSize),
        ...(dataset.blobHash ? { "X-Blob-Hash": dataset.blobHash } : {}),
        "X-Access-Log-Id": accessLog.id,
      },
    });
  } catch (error) {
    if (tempPath) {
      try { unlinkSync(tempPath); } catch { /* best-effort */ }
    }
    // logAccess() re-checks policy internally and may throw ForsetyAuthError
    if (error instanceof ForsetyAuthError) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return apiError("Failed to download dataset", error);
  }
}
