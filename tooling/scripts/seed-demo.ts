import { createDb } from "@forsety/db";
import { datasets, licenses, policies, accessLogs } from "@forsety/db";
import { eq } from "drizzle-orm";

const DEMO_DATASETS = [
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
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("\n🌱 Forsety — Seeding Demo Data\n");

  const db = createDb(databaseUrl);

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

    // Create dataset
    const [dataset] = await db
      .insert(datasets)
      .values({
        name: demo.name,
        description: demo.description,
        ownerAddress: demo.ownerAddress,
        shelbyBlobName: `forsety/${demo.name.toLowerCase().replace(/\s+/g, "-")}`,
        blobHash: `sha256:demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      })
      .returning();

    console.log(`  ✓ Created dataset: ${demo.name}`);

    // Create license
    await db.insert(licenses).values({
      datasetId: dataset!.id,
      spdxType: demo.license.spdxType,
      grantorAddress: demo.ownerAddress,
      terms: demo.license.terms,
    });

    console.log(`    ✓ License: ${demo.license.spdxType}`);

    // Create policy
    const [policy] = await db
      .insert(policies)
      .values({
        datasetId: dataset!.id,
        allowedAccessors: demo.policy.allowedAccessors,
        maxReads: demo.policy.maxReads,
        version: 1,
        createdBy: "seed-demo",
      })
      .returning();

    console.log(`    ✓ Policy: v1, max ${demo.policy.maxReads} reads`);

    // Create mock access log
    await db.insert(accessLogs).values({
      datasetId: dataset!.id,
      policyId: policy!.id,
      accessorAddress: demo.ownerAddress,
      operationType: "read",
      policyVersion: 1,
    });

    console.log(`    ✓ Access log: 1 mock read`);
  }

  console.log("\n✅ Seed complete\n");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
