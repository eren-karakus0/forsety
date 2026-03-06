import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { datasets } from "./datasets";

export const licenses = pgTable("licenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  datasetId: uuid("dataset_id")
    .notNull()
    .references(() => datasets.id, { onDelete: "cascade" }),
  spdxType: text("spdx_type").notNull(),
  grantorAddress: text("grantor_address").notNull(),
  terms: jsonb("terms").$type<Record<string, unknown>>(),
  termsHash: text("terms_hash"),
  metadataBlobId: text("metadata_blob_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type License = typeof licenses.$inferSelect;
export type NewLicense = typeof licenses.$inferInsert;
