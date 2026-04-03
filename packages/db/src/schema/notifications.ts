import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipientAddress: text("recipient_address").notNull(),
  type: text("type").notNull(), // policy_expiring, access_denied, agent_registered, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedResourceType: text("related_resource_type"), // dataset, policy, agent
  relatedResourceId: text("related_resource_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("idx_notifications_recipient_unread").on(
    t.recipientAddress,
    t.isRead,
    t.createdAt
  ),
]);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
