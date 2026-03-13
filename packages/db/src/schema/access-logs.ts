import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { datasets } from "./datasets";
import { policies } from "./policies";

export const accessLogs = pgTable("access_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  datasetId: uuid("dataset_id")
    .notNull()
    .references(() => datasets.id, { onDelete: "cascade" }),
  policyId: uuid("policy_id").references(() => policies.id),
  accessorAddress: text("accessor_address").notNull(),
  operationType: text("operation_type").notNull(),
  blobHashAtRead: text("blob_hash_at_read"),
  readProof: text("read_proof"),
  policyVersion: integer("policy_version"),
  policyHash: text("policy_hash"),
  licenseHash: text("license_hash"),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("idx_access_logs_dataset_timestamp").on(t.datasetId, t.timestamp),
  index("idx_access_logs_accessor_timestamp").on(t.accessorAddress, t.timestamp),
]);

export type AccessLog = typeof accessLogs.$inferSelect;
export type NewAccessLog = typeof accessLogs.$inferInsert;
