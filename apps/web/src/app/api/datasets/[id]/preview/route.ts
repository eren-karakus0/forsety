import { NextRequest, NextResponse } from "next/server";
import { openSync, readSync, closeSync, statSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { resolveAccessor, checkAgentScope, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

const MAX_PREVIEW_SIZE = 64 * 1024; // 64 KB

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let tempPath: string | null = null;

  try {
    const { id } = await params;
    const auth = await resolveAccessor(request);
    if (!auth || !auth.trusted) return unauthorizedResponse();

    const scope = checkAgentScope(auth, "dataset.read", id);
    if (!scope.allowed) {
      return NextResponse.json({ error: scope.error ?? "Access denied" }, { status: 403 });
    }

    const client = getForsetyClient();
    const dataset = await client.datasets.getById(id);
    if (!dataset || !dataset.shelbyBlobName) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    // Only owner or policy-allowed accessor can preview
    const { allowed } = await client.policies.checkAccess(id, auth.accessor);
    const isOwner = dataset.ownerAddress === auth.accessor;
    if (!allowed && !isOwner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const downloadDir = join(tmpdir(), "forsety-previews");
    mkdirSync(downloadDir, { recursive: true });
    const safeName = dataset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    tempPath = join(downloadDir, `${randomUUID()}-${safeName}`);

    await client.getShelby().downloadDataset(dataset.shelbyBlobName, tempPath);

    // Only read first MAX_PREVIEW_SIZE bytes — avoid loading entire file into RAM
    const totalSize = statSync(tempPath).size;
    const readSize = Math.min(totalSize, MAX_PREVIEW_SIZE);
    const partial = Buffer.alloc(readSize);
    const fd = openSync(tempPath, "r");
    try {
      readSync(fd, partial, 0, readSize, 0);
    } finally {
      closeSync(fd);
    }
    const text = partial.toString("utf-8");
    const ext = dataset.name.split(".").pop()?.toLowerCase();

    let result: {
      type: string;
      preview: string | string[][];
      totalSize: number;
      columns?: string[];
      rowCount?: number;
    };

    if (ext === "csv" || ext === "tsv") {
      const delimiter = ext === "tsv" ? "\t" : ",";
      const lines = text.split("\n").filter(Boolean).slice(0, 51);
      const rows = lines.map((line) => line.split(delimiter));
      const columns = rows[0] ?? [];
      const dataRows = rows.slice(1);
      result = {
        type: "tabular",
        preview: dataRows,
        totalSize,
        columns,
        rowCount: text.split("\n").filter(Boolean).length - 1,
      };
    } else if (ext === "json" || ext === "jsonl") {
      const previewText = text.slice(0, 2048);
      try {
        const parsed = JSON.parse(previewText);
        result = {
          type: "json",
          preview: JSON.stringify(parsed, null, 2).slice(0, 2048),
          totalSize,
        };
      } catch {
        result = { type: "json", preview: previewText, totalSize };
      }
    } else if (ext === "txt" || ext === "md") {
      result = { type: "text", preview: text.slice(0, 2048), totalSize };
    } else {
      result = {
        type: "binary",
        preview: `Binary file (${ext ?? "unknown"} format)`,
        totalSize,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    return apiError("Failed to generate preview", error);
  } finally {
    if (tempPath) {
      try { unlinkSync(tempPath); } catch { /* best-effort */ }
    }
  }
}
