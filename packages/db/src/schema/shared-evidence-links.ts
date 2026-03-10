import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { evidencePacks } from "./evidence-packs";

export const sharedEvidenceLinks = pgTable("shared_evidence_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  evidencePackId: uuid("evidence_pack_id")
    .notNull()
    .references(() => evidencePacks.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  mode: text("mode").notNull().$type<"full" | "redacted">(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: text("created_by"),
});

export type SharedEvidenceLink = typeof sharedEvidenceLinks.$inferSelect;
export type NewSharedEvidenceLink = typeof sharedEvidenceLinks.$inferInsert;
