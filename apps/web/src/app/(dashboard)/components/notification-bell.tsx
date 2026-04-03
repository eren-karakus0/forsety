"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@forsety/ui";
import { Bell, Check, Database, Shield, Users } from "lucide-react";
import { useAuthGuard } from "@/hooks/use-auth-guard";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedResourceType: string | null;
  relatedResourceId: string | null;
  isRead: boolean;
  createdAt: string;
}

const typeIcon: Record<string, typeof Database> = {
  policy_expiring: Shield,
  access_denied: Shield,
  agent_registered: Users,
  dataset: Database,
};

export function NotificationBell() {
  const { isAuthenticated } = useAuthGuard();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
        credentials: "include",
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // silently fail
    }
  }

  async function handleClick(n: NotificationItem) {
    if (!n.isRead) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
        credentials: "include",
      }).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
    }

    if (n.relatedResourceType === "dataset" && n.relatedResourceId) {
      router.push(`/dashboard/${n.relatedResourceId}`);
    } else if (n.relatedResourceType === "agent" && n.relatedResourceId) {
      router.push(`/dashboard/agents/${n.relatedResourceId}`);
    } else if (n.relatedResourceType === "policy") {
      router.push("/dashboard/policies");
    }
  }

  if (!isAuthenticated) return null;

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-[11px]" onClick={markAllRead}>
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <Bell className="h-5 w-5 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => {
            const IconComponent = typeIcon[n.type] ?? Bell;
            return (
              <DropdownMenuItem
                key={n.id}
                className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
                onClick={() => handleClick(n)}
              >
                <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${n.isRead ? "bg-muted/40" : "bg-gold-50"}`}>
                  <IconComponent className={`h-3.5 w-3.5 ${n.isRead ? "text-muted-foreground" : "text-gold-500"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium ${n.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                    {n.message}
                  </p>
                </div>
                <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                  {formatTime(n.createdAt)}
                </span>
                {!n.isRead && (
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-gold-500" />
                )}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
