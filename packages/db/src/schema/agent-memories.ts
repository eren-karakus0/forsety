import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { agents } from "./agents";

export const agentMemories = pgTable("agent_memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  namespace: text("namespace").notNull().default("default"),
  key: text("key").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  contentHash: text("content_hash").notNull(),
  contentType: text("content_type").notNull().default("json"),
  sizeBytes: integer("size_bytes"),
  tags: text("tags").array().notNull().default([]),
  shelbyBlobId: text("shelby_blob_id"),
  ttlSeconds: integer("ttl_seconds"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type AgentMemory = typeof agentMemories.$inferSelect;
export type NewAgentMemory = typeof agentMemories.$inferInsert;
