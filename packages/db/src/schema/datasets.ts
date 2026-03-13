import { pgTable, uuid, text, bigint, timestamp, index } from "drizzle-orm/pg-core";

export const datasets = pgTable("datasets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  shelbyBlobId: text("shelby_blob_id"),
  shelbyBlobName: text("shelby_blob_name"),
  blobHash: text("blob_hash"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  ownerAddress: text("owner_address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (t) => [
  index("idx_datasets_owner_archived").on(t.ownerAddress, t.archivedAt, t.createdAt),
]);

export type Dataset = typeof datasets.$inferSelect;
export type NewDataset = typeof datasets.$inferInsert;
