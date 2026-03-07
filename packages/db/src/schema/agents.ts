import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  agentApiKey: text("agent_api_key").notNull().unique(),
  ownerAddress: text("owner_address").notNull(),
  permissions: text("permissions").array().notNull().default([]),
  allowedDatasets: text("allowed_datasets").array().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  isActive: boolean("is_active").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
