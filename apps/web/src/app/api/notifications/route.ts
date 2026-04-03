import { NextRequest, NextResponse } from "next/server";
import { validateJwtCookie, unauthorizedResponse } from "@/lib/auth";
import { getForsetyClient } from "@/lib/forsety";
import { apiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const wallet = await validateJwtCookie(request);
    if (!wallet) return unauthorizedResponse();

    const client = getForsetyClient();
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);

    const [items, unreadCount] = await Promise.all([
      client.notifications.listByRecipient(wallet, { unreadOnly, limit }),
      client.notifications.countUnread(wallet),
    ]);

    return NextResponse.json({
      notifications: items.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    return apiError("Failed to fetch notifications", error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const wallet = await validateJwtCookie(request);
    if (!wallet) return unauthorizedResponse();

    const body = await request.json();
    const client = getForsetyClient();

    if (body.markAllRead) {
      await client.notifications.markAllRead(wallet);
      return NextResponse.json({ success: true });
    }

    if (body.id) {
      const updated = await client.notifications.markRead(body.id, wallet);
      if (!updated) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return apiError("Failed to update notification", error);
  }
}
