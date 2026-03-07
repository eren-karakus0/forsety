import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { agents } from "./agents";

export const agentAuditLogs = pgTable("agent_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  toolName: text("tool_name"),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  input: jsonb("input").$type<Record<string, unknown>>(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  status: text("status").notNull().default("success"),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type AgentAuditLog = typeof agentAuditLogs.$inferSelect;
export type NewAgentAuditLog = typeof agentAuditLogs.$inferInsert;
