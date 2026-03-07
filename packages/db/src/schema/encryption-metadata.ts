import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const encryptionMetadata = pgTable(
  "encryption_metadata",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceType: text("resource_type").notNull(), // 'memory' | 'dataset'
    resourceId: uuid("resource_id").notNull(),
    algorithm: text("algorithm").notNull().default("aes-256-gcm"),
    iv: text("iv").notNull(), // Base64 encoded IV
    keyDerivationVersion: integer("key_derivation_version")
      .notNull()
      .default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("encryption_metadata_resource_idx").on(
      table.resourceType,
      table.resourceId
    ),
  ]
);

export type EncryptionMetadata = typeof encryptionMetadata.$inferSelect;
export type NewEncryptionMetadata = typeof encryptionMetadata.$inferInsert;
