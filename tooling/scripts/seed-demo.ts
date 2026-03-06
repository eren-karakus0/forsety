import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { createDb } from "@forsety/db";
import { datasets, licenses, policies, accessLogs } from "@forsety/db";
import { eq } from "drizzle-orm";

function shellQuote(arg: string): string {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

function shelbyExec(args: string[]): string | null {
  try {
    const cmd = ["shelby", ...args].map(shellQuote).join(" ");
    return execFileSync("wsl", ["-e", "bash", "-lc", cmd], {
      encoding: "utf-8",
      timeout: 60_000,
    }).trim();
  } catch {
    return null;
  }
}

function checkShelbyAvailable(): boolean {
  const version = shelbyExec(["--version"]);
  return version !== null;
}

interface DemoDataset {
  name: string;
  description: string;
  ownerAddress: string;
  license: {
    spdxType: string;
    terms: Record<string, unknown>;
  };
  policy: {
    allowedAccessors: string[];
    maxReads: number;
  };
  sampleContent: string;
}

const DEMO_DATASETS: DemoDataset[] = [
  {
    name: "ImageNet Validation Subset",
    description: "Curated subset of ImageNet for model validation",
    ownerAddress:
      "0xa9f09def6947e6112d0c181779edb9e5115981acc81230fa10ef249a4053e836",
    license: {
      spdxType: "CC-BY-4.0",
      terms: { attribution: true, commercial: true },
    },
    policy: { allowedAccessors: ["*"], maxReads: 100 },
    sampleContent: '{"type":"imagenet-subset","count":1000,"format":"JPEG","resolution":"224x224"}',
  },
  {
    name: "Common Crawl License Metadata",
    description: "Extracted license metadata from Common Crawl corpus",
    ownerAddress:
      "0xa9f09def6947e6112d0c181779edb9e5115981acc81230fa10ef249a4053e836",
    license: {
      spdxType: "MIT",
      terms: { attribution: true, commercial: true, modification: true },
    },
    policy: { allowedAccessors: ["*"], maxReads: 500 },
    sampleContent: '{"type":"license-metadata","source":"commoncrawl","records":5000}',
  },
  {
    name: "LAION Ethics Subset",
    description: "Filtered LAION subset with ethical usage constraints",
    ownerAddress:
      "0xa9f09def6947e6112d0c181779edb9e5115981acc81230fa10ef249a4053e836",
    license: {
      spdxType: "Apache-2.0",
      terms: { attribution: true, patent: true },
    },
    policy: {
      allowedAccessors: [
        "0xa9f09def6947e6112d0c181779edb9e5115981acc81230fa10ef249a4053e836",
      ],
      maxReads: 50,
    },
    sampleContent: '{"type":"laion-subset","filter":"ethical","count":2000}',
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const localOnly = process.argv.includes("--local-only");

  console.log("\n🌱 Forsety — Seeding Demo Data\n");

  const db = createDb(databaseUrl);

  if (localOnly) {
    console.log("  --local-only flag set — skipping Shelby uploads\n");
  } else {
    const shelbyAvailable = checkShelbyAvailable();
    if (!shelbyAvailable) {
      console.error("  ✗ Shelby CLI not available. Use --local-only to seed without Shelby.\n");
      process.exit(1);
    }
    console.log("  Shelby CLI detected — uploading to Shelby network\n");
  }

  const tmpDir = join(tmpdir(), "forsety-seed");
  mkdirSync(tmpDir, { recursive: true });

  for (const demo of DEMO_DATASETS) {
    // Check if already exists (idempotent)
    const existing = await db
      .select()
      .from(datasets)
      .where(eq(datasets.name, demo.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ⏭ ${demo.name} — already exists, skipping`);
      continue;
    }

    const blobName = `forsety/${demo.name.toLowerCase().replace(/\s+/g, "-")}`;
    let blobId: string | undefined;
    let blobHash: string;
    let sizeBytes: number;

    // Create temp file with sample content
    const tempFile = join(tmpDir, `${Date.now()}-seed.json`);
    writeFileSync(tempFile, demo.sampleContent);
    sizeBytes = Buffer.byteLength(demo.sampleContent);
    blobHash = createHash("sha256").update(demo.sampleContent).digest("hex");

    if (!localOnly) {
      // Real Shelby upload
      const wslPath = tempFile
        .replace(/\\/g, "/")
        .replace(/^([A-Za-z]):/, (_m, d: string) => `/mnt/${d.toLowerCase()}`);

      // CLI contract: shelby upload [source] [destination] -e <expiration>
      const output = shelbyExec([
        "upload", wslPath, blobName,
        "-e", "in 7 days",
        "--assume-yes",
      ]);

      if (output) {
        const idMatch = output.match(/blob[_\s]?id[:\s]+(\S+)/i);
        blobId = idMatch?.[1] ?? blobName;
        console.log(`  ✓ Uploaded to Shelby: ${blobName}`);
      } else {
        console.error(`  ✗ Shelby upload failed for ${blobName}. Aborting.`);
        process.exit(1);
      }
    }

    // Cleanup temp file
    try { unlinkSync(tempFile); } catch { /* ignore */ }

    // Create dataset in DB
    const [dataset] = await db
      .insert(datasets)
      .values({
        name: demo.name,
        description: demo.description,
        ownerAddress: demo.ownerAddress,
        shelbyBlobId: blobId,
        shelbyBlobName: blobName,
        blobHash: `sha256:${blobHash}`,
        sizeBytes,
      })
      .returning();

    console.log(`  ✓ Created dataset: ${demo.name}`);

    // Create license with proper terms hash
    const termsPayload = JSON.stringify({
      spdxType: demo.license.spdxType,
      grantorAddress: demo.ownerAddress,
      terms: demo.license.terms,
    });
    const termsHash = createHash("sha256").update(termsPayload).digest("hex");

    await db.insert(licenses).values({
      datasetId: dataset!.id,
      spdxType: demo.license.spdxType,
      grantorAddress: demo.ownerAddress,
      terms: demo.license.terms,
      termsHash,
    });

    console.log(`    ✓ License: ${demo.license.spdxType} (hash: ${termsHash.slice(0, 12)}...)`);

    // Create policy with hash
    const policyData = {
      datasetId: dataset!.id,
      allowedAccessors: demo.policy.allowedAccessors,
      maxReads: demo.policy.maxReads,
      version: 1,
    };
    const policyHash = createHash("sha256")
      .update(JSON.stringify(policyData))
      .digest("hex");

    const [policy] = await db
      .insert(policies)
      .values({
        ...policyData,
        hash: policyHash,
        createdBy: "seed-demo",
      })
      .returning();

    console.log(`    ✓ Policy: v1, max ${demo.policy.maxReads} reads`);

    // Create mock access log with read proof
    // Use the same timestamp for both proof and DB insert (re-derivable)
    const accessTimestamp = new Date();
    const proofPayload = JSON.stringify({
      datasetId: dataset!.id,
      accessorAddress: demo.ownerAddress,
      blobHash: `sha256:${blobHash}`,
      blobName,
      operationType: "read",
      policyId: policy!.id,
      licenseHash: termsHash,
      timestamp: accessTimestamp.toISOString(),
    });
    const readProof = createHash("sha256").update(proofPayload).digest("hex");

    await db.insert(accessLogs).values({
      datasetId: dataset!.id,
      policyId: policy!.id,
      accessorAddress: demo.ownerAddress,
      operationType: "read",
      blobHashAtRead: `sha256:${blobHash}`,
      readProof,
      policyVersion: 1,
      policyHash,
      licenseHash: termsHash,
      timestamp: accessTimestamp,
    });

    console.log(`    ✓ Access log: 1 read (proof: ${readProof.slice(0, 12)}...)`);
  }

  console.log("\n✅ Seed complete\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
