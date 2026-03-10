/**
 * One-off backfill script: populates pack_json_canonical for existing evidence_packs.
 *
 * Usage:
 *   pnpm backfill:canonical          # dry-run (shows what would change)
 *   pnpm backfill:canonical --apply  # actually writes to DB
 *
 * Requires: DATABASE_URL env var
 */
import { createHash } from "node:crypto";
import canonicalize from "canonicalize";
import { createDb } from "@forsety/db";
import { evidencePacks } from "@forsety/db";
import { isNull } from "drizzle-orm";
import { eq } from "drizzle-orm";

const dryRun = !process.argv.includes("--apply");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const db = createDb(databaseUrl);

  // Find all evidence packs where pack_json_canonical is null
  const rows = await db
    .select({
      id: evidencePacks.id,
      packJson: evidencePacks.packJson,
      packHash: evidencePacks.packHash,
    })
    .from(evidencePacks)
    .where(isNull(evidencePacks.packJsonCanonical));

  console.log(`Found ${rows.length} evidence packs without canonical JSON`);

  if (rows.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  let updated = 0;
  let hashFixed = 0;

  for (const row of rows) {
    const canonical = canonicalize(row.packJson) ?? JSON.stringify(row.packJson);
    const newHash = createHash("sha256").update(canonical).digest("hex");
    const hashChanged = newHash !== row.packHash;

    if (dryRun) {
      console.log(
        `  [DRY-RUN] ${row.id}: canonical=${canonical.length} chars, hash ${hashChanged ? "CHANGED" : "unchanged"}`
      );
    } else {
      await db
        .update(evidencePacks)
        .set({
          packJsonCanonical: canonical,
          packHash: newHash,
        })
        .where(eq(evidencePacks.id, row.id));
      updated++;
      if (hashChanged) hashFixed++;
    }
  }

  if (dryRun) {
    console.log(`\nDry run complete. Run with --apply to write changes.`);
  } else {
    console.log(`\nBackfill complete: ${updated} updated, ${hashFixed} hashes corrected.`);
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
