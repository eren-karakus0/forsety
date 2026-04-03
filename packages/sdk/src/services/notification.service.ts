import { eq, and, desc, sql } from "drizzle-orm";
import { notifications } from "@forsety/db";
import type { Database } from "@forsety/db";
import type { Notification } from "@forsety/db";

export class NotificationService {
  constructor(private db: Database) {}

  async create(input: {
    recipientAddress: string;
    type: string;
    title: string;
    message: string;
    relatedResourceType?: string;
    relatedResourceId?: string;
  }): Promise<Notification> {
    const [notification] = await this.db
      .insert(notifications)
      .values(input)
      .returning();
    return notification;
  }

  async listByRecipient(
    address: string,
    filters?: { unreadOnly?: boolean; limit?: number; offset?: number }
  ): Promise<Notification[]> {
    const conditions = [eq(notifications.recipientAddress, address)];
    if (filters?.unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    return this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(filters?.limit ?? 20)
      .offset(filters?.offset ?? 0);
  }

  async countUnread(address: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientAddress, address),
          eq(notifications.isRead, false)
        )
      );
    return result?.count ?? 0;
  }

  async markRead(id: string, recipientAddress: string): Promise<boolean> {
    const [updated] = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientAddress, recipientAddress)
        )
      )
      .returning({ id: notifications.id });
    return !!updated;
  }

  async markAllRead(address: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.recipientAddress, address),
          eq(notifications.isRead, false)
        )
      );
  }
}
