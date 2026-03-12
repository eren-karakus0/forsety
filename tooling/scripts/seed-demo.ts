import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { createDb } from "@forsety/db";
import {
  datasets,
  licenses,
  policies,
  accessLogs,
  agents,
  agentAuditLogs,
  evidencePacks,
} from "@forsety/db";
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

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86400_000);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3600_000);
}

const OWNER =
  "0xa9f09def6947e6112d0c181779edb9e5115981acc81230fa10ef249a4053e836";

// --- Demo Data Definitions ---

const DEMO_DATASETS = [
  {
    name: "ImageNet Validation Subset",
    description: "Curated subset of ImageNet for model validation — 1,000 labeled images across 50 categories",
    spdxType: "CC-BY-4.0",
    terms: { attribution: true, commercial: true },
    maxReads: 100,
    content: '{"type":"imagenet-subset","count":1000,"format":"JPEG","resolution":"224x224"}',
  },
  {
    name: "Common Crawl License Metadata",
    description: "Extracted license metadata from Common Crawl corpus Q4 2025",
    spdxType: "MIT",
    terms: { attribution: true, commercial: true, modification: true },
    maxReads: 500,
    content: '{"type":"license-metadata","source":"commoncrawl","records":5000}',
  },
  {
    name: "LAION Ethics Subset",
    description: "Filtered LAION subset with ethical usage constraints — research only",
    spdxType: "Apache-2.0",
    terms: { attribution: true, patent: true },
    maxReads: 50,
    content: '{"type":"laion-subset","filter":"ethical","count":2000}',
  },
  {
    name: "OpenBooks NLP Corpus",
    description: "Public domain book texts for NLP training — 12,000 titles",
    spdxType: "CC0-1.0",
    terms: { attribution: false, commercial: true, modification: true },
    maxReads: 1000,
    content: '{"type":"nlp-corpus","source":"gutenberg+openlib","titles":12000,"languages":["en","de","fr"]}',
  },
  {
    name: "MedQA Clinical Dataset",
    description: "De-identified clinical Q&A pairs for medical AI evaluation",
    spdxType: "CC-BY-NC-4.0",
    terms: { attribution: true, commercial: false, researchOnly: true },
    maxReads: 30,
    content: '{"type":"medical-qa","pairs":8500,"specialties":["cardiology","neurology","oncology"]}',
  },
];

const DEMO_AGENTS = [
  {
    name: "DataPipeline-Agent",
    description: "Automated data ingestion and validation pipeline",
    permissions: ["dataset:read", "policy:check"],
    tools: ["forsety_dataset_access", "forsety_policy_check"],
  },
  {
    name: "ComplianceBot",
    description: "Monitors license compliance and generates violation reports",
    permissions: ["dataset:read", "policy:check", "memory:write"],
    tools: ["forsety_policy_check", "forsety_memory_store", "forsety_memory_search"],
  },
  {
    name: "ResearchAssistant",
    description: "Assists researchers with dataset discovery and access",
    permissions: ["dataset:read"],
    tools: ["forsety_dataset_access"],
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const localOnly = process.argv.includes("--local-only");

  console.log("\n  Forsety — Seeding Demo Data\n");

  const db = createDb(databaseUrl);

  if (localOnly) {
    console.log("  --local-only flag set — skipping Shelby uploads\n");
  } else {
    const shelbyAvailable = checkShelbyAvailable();
    if (!shelbyAvailable) {
      console.error(
        "  Shelby CLI not available. Use --local-only to seed without Shelby.\n"
      );
      process.exit(1);
    }
    console.log("  Shelby CLI detected — uploading to Shelby network\n");
  }

  const tmpDir = join(tmpdir(), "forsety-seed");
  mkdirSync(tmpDir, { recursive: true });

  // ── 1. Datasets + Licenses + Policies ──────────────────────────

  console.log("  [Datasets]");

  const datasetRecords: { id: string; name: string; blobHash: string; termsHash: string; policyId: string; policyHash: string }[] = [];

  for (const demo of DEMO_DATASETS) {
    const existing = await db
      .select()
      .from(datasets)
      .where(eq(datasets.name, demo.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`    skip  ${demo.name} — already exists`);
      // Still collect for later references
      const blobHash = sha256(demo.content);
      const termsHash = sha256(JSON.stringify({ spdxType: demo.spdxType, grantorAddress: OWNER, terms: demo.terms }));
      datasetRecords.push({
        id: existing[0].id,
        name: demo.name,
        blobHash,
        termsHash,
        policyId: "",
        policyHash: "",
      });
      continue;
    }

    const blobName = `forsety/${demo.name.toLowerCase().replace(/\s+/g, "-")}`;
    let blobId: string | undefined;
    const blobHash = sha256(demo.content);
    const sizeBytes = Buffer.byteLength(demo.content);

    if (!localOnly) {
      const tempFile = join(tmpDir, `${Date.now()}-seed.json`);
      writeFileSync(tempFile, demo.content);
      const wslPath = tempFile
        .replace(/\\/g, "/")
        .replace(/^([A-Za-z]):/, (_m, d: string) => `/mnt/${d.toLowerCase()}`);
      const output = shelbyExec([
        "upload", wslPath, blobName, "-e", "in 7 days", "--assume-yes",
      ]);
      if (output) {
        const idMatch = output.match(/blob[_\s]?id[:\s]+(\S+)/i);
        blobId = idMatch?.[1] ?? blobName;
      }
      try { unlinkSync(tempFile); } catch { /* ignore */ }
    }

    const [dataset] = await db
      .insert(datasets)
      .values({
        name: demo.name,
        description: demo.description,
        ownerAddress: OWNER,
        shelbyBlobId: blobId,
        shelbyBlobName: blobName,
        blobHash: `sha256:${blobHash}`,
        sizeBytes,
      })
      .returning();

    // License
    const termsPayload = JSON.stringify({ spdxType: demo.spdxType, grantorAddress: OWNER, terms: demo.terms });
    const termsHash = sha256(termsPayload);

    await db.insert(licenses).values({
      datasetId: dataset!.id,
      spdxType: demo.spdxType,
      grantorAddress: OWNER,
      terms: demo.terms,
      termsHash,
    });

    // Policy
    const policyData = {
      datasetId: dataset!.id,
      allowedAccessors: ["*"],
      maxReads: demo.maxReads,
      version: 1,
    };
    const policyHash = sha256(JSON.stringify(policyData));

    const [policy] = await db
      .insert(policies)
      .values({ ...policyData, hash: policyHash, createdBy: "seed-demo" })
      .returning();

    datasetRecords.push({
      id: dataset!.id,
      name: demo.name,
      blobHash,
      termsHash,
      policyId: policy!.id,
      policyHash,
    });

    console.log(`    +  ${demo.name} (${demo.spdxType})`);
  }

  // ── 2. Access Logs (varied operations + 1 denied) ──────────────

  console.log("\n  [Access Logs]");

  const accessOps = [
    { dsIdx: 0, op: "read", hours: 2 },
    { dsIdx: 0, op: "download", hours: 5 },
    { dsIdx: 1, op: "read", hours: 1 },
    { dsIdx: 1, op: "verify", hours: 8 },
    { dsIdx: 2, op: "read", hours: 3 },
    { dsIdx: 2, op: "read", hours: 24 },
    { dsIdx: 3, op: "read", hours: 0.5 },
    { dsIdx: 3, op: "download", hours: 12 },
    { dsIdx: 4, op: "read", hours: 6 },
    { dsIdx: 4, op: "download", hours: 48 },
  ];

  for (const op of accessOps) {
    const ds = datasetRecords[op.dsIdx];
    if (!ds || !ds.policyId) continue;

    const ts = hoursAgo(op.hours);
    const proofPayload = JSON.stringify({
      datasetId: ds.id,
      accessorAddress: OWNER,
      blobHash: `sha256:${ds.blobHash}`,
      operationType: op.op,
      policyId: ds.policyId,
      licenseHash: ds.termsHash,
      timestamp: ts.toISOString(),
    });

    await db.insert(accessLogs).values({
      datasetId: ds.id,
      policyId: ds.policyId,
      accessorAddress: OWNER,
      operationType: op.op,
      blobHashAtRead: `sha256:${ds.blobHash}`,
      readProof: sha256(proofPayload),
      policyVersion: 1,
      policyHash: ds.policyHash,
      licenseHash: ds.termsHash,
      timestamp: ts,
    });
  }

  console.log(`    + ${accessOps.length} access log entries`);

  // ── 3. Evidence Packs ──────────────────────────────────────────

  console.log("\n  [Evidence Packs]");

  for (let i = 0; i < Math.min(4, datasetRecords.length); i++) {
    const ds = datasetRecords[i];
    if (!ds) continue;

    const packJson = {
      version: "2.0.0",
      generatedAt: hoursAgo(i * 6).toISOString(),
      dataset: { id: ds.id, name: ds.name, blobHash: `sha256:${ds.blobHash}` },
      license: { termsHash: ds.termsHash },
      policy: { id: ds.policyId, version: 1, hash: ds.policyHash },
      accessLog: [
        {
          operationType: "read",
          accessorAddress: OWNER,
          timestamp: hoursAgo(i * 6 + 1).toISOString(),
          licenseHash: ds.termsHash,
        },
      ],
      proof: { algorithm: "sha256", shelbyBlobId: null },
    };

    const canonical = JSON.stringify(packJson);
    const packHash = sha256(canonical);

    await db.insert(evidencePacks).values({
      datasetId: ds.id,
      packJson,
      packJsonCanonical: canonical,
      packHash,
      generatedAt: hoursAgo(i * 6),
      generatedBy: "seed-demo",
    });

    console.log(`    + Evidence: ${ds.name}`);
  }

  // ── 4. Agents ──────────────────────────────────────────────────

  console.log("\n  [Agents]");

  const agentRecords: { id: string; name: string }[] = [];

  for (const demo of DEMO_AGENTS) {
    const existing = await db
      .select()
      .from(agents)
      .where(eq(agents.name, demo.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`    skip  ${demo.name} — already exists`);
      agentRecords.push({ id: existing[0].id, name: demo.name });
      continue;
    }

    const rawKey = `fsy_demo_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const hashedKey = sha256(rawKey);

    const [agent] = await db
      .insert(agents)
      .values({
        name: demo.name,
        description: demo.description,
        agentApiKey: hashedKey,
        ownerAddress: OWNER,
        permissions: demo.permissions,
        allowedDatasets: datasetRecords.slice(0, 3).map((d) => d.id),
        isActive: true,
        lastSeenAt: hoursAgo(Math.random() * 24),
      })
      .returning();

    agentRecords.push({ id: agent!.id, name: demo.name });
    console.log(`    + ${demo.name}`);
  }

  // ── 5. Agent Audit Logs ────────────────────────────────────────

  console.log("\n  [Agent Audit Logs]");

  const auditEntries = [
    { agentIdx: 0, action: "tool_call", tool: "forsety_dataset_access", status: "success", hours: 1 },
    { agentIdx: 0, action: "tool_call", tool: "forsety_policy_check", status: "success", hours: 1.5 },
    { agentIdx: 1, action: "tool_call", tool: "forsety_policy_check", status: "success", hours: 2 },
    { agentIdx: 1, action: "tool_call", tool: "forsety_memory_store", status: "success", hours: 3 },
    { agentIdx: 1, action: "tool_call", tool: "forsety_policy_check", status: "denied", hours: 4 },
    { agentIdx: 2, action: "tool_call", tool: "forsety_dataset_access", status: "success", hours: 0.5 },
    { agentIdx: 2, action: "tool_call", tool: "forsety_dataset_access", status: "error", hours: 6 },
  ];

  for (const entry of auditEntries) {
    const agent = agentRecords[entry.agentIdx];
    if (!agent) continue;

    const ds = datasetRecords[entry.agentIdx % datasetRecords.length];

    await db.insert(agentAuditLogs).values({
      agentId: agent.id,
      action: entry.action,
      toolName: entry.tool,
      resourceType: "dataset",
      resourceId: ds?.id,
      input: { datasetId: ds?.id, operationType: "read" },
      output: entry.status === "success"
        ? { allowed: true }
        : entry.status === "denied"
          ? { allowed: false, reason: "Policy restriction: commercial use not permitted" }
          : null,
      status: entry.status,
      errorMessage: entry.status === "error" ? "Connection timeout to dataset storage" : null,
      durationMs: Math.floor(50 + Math.random() * 200),
      timestamp: hoursAgo(entry.hours),
    });
  }

  console.log(`    + ${auditEntries.length} audit log entries`);

  console.log("\n  Seed complete\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
