import { pgTable, uuid, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { datasets } from "./datasets";

export const evidencePacks = pgTable("evidence_packs", {
  id: uuid("id").defaultRandom().primaryKey(),
  datasetId: uuid("dataset_id")
    .notNull()
    .references(() => datasets.id, { onDelete: "cascade" }),
  packJson: jsonb("pack_json").$type<Record<string, unknown>>().notNull(),
  packHash: text("pack_hash").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  generatedBy: text("generated_by"),
});

export type EvidencePack = typeof evidencePacks.$inferSelect;
export type NewEvidencePack = typeof evidencePacks.$inferInsert;
