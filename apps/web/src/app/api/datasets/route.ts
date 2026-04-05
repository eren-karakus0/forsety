import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { resolveAccessor, resolveAccessorStrict, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";
import { hasAllowedExtension, ALLOWED_EXTENSIONS_SUMMARY } from "@/lib/allowed-extensions";

export async function GET(request: NextRequest) {
  const auth = await resolveAccessor(request);
  if (!auth) return unauthorizedResponse();

  try {
    const client = getForsetyClient();
    const datasets = await client.datasets.listByOwner(auth.accessor);
    return NextResponse.json({ datasets });
  } catch (error) {
    return apiError("Failed to fetch datasets", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await resolveAccessorStrict(request);
  if (!auth) return unauthorizedResponse();

  let tempPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || undefined;
    // ownerAddress comes from auth context, NOT from formData (prevents spoofing)
    const ownerAddress = auth.accessor;
    const spdxType = formData.get("spdxType") as string;
    const grantorAddress = (formData.get("grantorAddress") as string) || ownerAddress;

    if (!name || !spdxType) {
      return NextResponse.json(
        { error: "Missing required fields: name, spdxType" },
        { status: 400 }
      );
    }

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 413 }
      );
    }

    // File extension allowlist
    if (!hasAllowedExtension(file.name)) {
      return NextResponse.json(
        { error: `File type not allowed. Supported: ${ALLOWED_EXTENSIONS_SUMMARY}` },
        { status: 415 }
      );
    }

    // Reject executable content types (defense-in-depth)
    const BLOCKED_TYPES = [
      "application/x-executable",
      "application/x-msdos-program",
      "application/x-msdownload",
      "application/x-sh",
      "application/x-shellscript",
    ];
    if (file.type && BLOCKED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Executable files are not allowed" },
        { status: 415 }
      );
    }

    const client = getForsetyClient();

    // Per-user daily upload quota (rolling 24h window)
    const DAILY_UPLOAD_LIMIT = 50;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyCount = await client.datasets.countByOwnerSince(ownerAddress, oneDayAgo);
    if (dailyCount >= DAILY_UPLOAD_LIMIT) {
      return NextResponse.json(
        { error: "Daily upload limit reached (50 uploads per 24 hours)" },
        { status: 429 }
      );
    }

    const uploadDir = join(tmpdir(), "forsety-uploads");
    mkdirSync(uploadDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    tempPath = join(uploadDir, `${randomUUID()}-${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic byte check: reject PE executables (MZ header) and ELF binaries
    if (buffer.length >= 2) {
      const magic = buffer.subarray(0, 4);
      if (magic[0] === 0x4d && magic[1] === 0x5a) { // MZ (PE executable)
        return NextResponse.json({ error: "Executable files are not allowed" }, { status: 415 });
      }
      if (magic[0] === 0x7f && magic[1] === 0x45 && magic[2] === 0x4c && magic[3] === 0x46) { // ELF
        return NextResponse.json({ error: "Executable files are not allowed" }, { status: 415 });
      }
    }

    writeFileSync(tempPath, buffer);
    const result = await client.datasets.upload({
      filePath: tempPath,
      name,
      description,
      ownerAddress,
      license: {
        spdxType,
        grantorAddress,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError("Failed to upload dataset", error);
  } finally {
    if (tempPath) {
      try { unlinkSync(tempPath); } catch { /* ignore */ }
    }
  }
}
