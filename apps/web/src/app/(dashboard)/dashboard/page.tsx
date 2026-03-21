"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchDashboardStats, fetchAllAuditLogs } from "./actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
} from "@forsety/ui";
import {
  Database,
  Users,
  Activity,
  ClipboardList,
  Upload,
  ArrowRight,
  AlertTriangle,
  Shield,
  CheckCircle2,
  XCircle,
  Wifi,
  Layers,
} from "lucide-react";
import {
  FadeInWrapper,
  StaggerWrapper,
  StaggerItemWrapper,
} from "./overview-animations";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { GuestStatCard } from "../components/guest-stat-card";
import { StatCard } from "../components/stat-card";
import { formatRelativeTime } from "@/lib/format";

interface RecentLog {
  id: string;
  agentId: string | null;
  action: string;
  toolName: string | null;
  status: string;
  timestamp: string;
}

interface OverviewData {
  totalDatasets: number;
  registeredAgents: number;
  activeAgents: number;
  recentLogs: RecentLog[];
  error: boolean;
}

const statusColor: Record<string, string> = {
  success: "default",
  denied: "destructive",
  error: "destructive",
};

const quickActions = [
  {
    href: "/dashboard/datasets",
    icon: Database,
    title: "Datasets",
    description: "Browse and manage your licensed datasets",
    iconColor: "text-gold-500",
    iconBg: "bg-gold-50",
  },
  {
    href: "/dashboard/evidence",
    icon: Layers,
    title: "Evidence",
    description: "View cryptographic evidence packs",
    iconColor: "text-gold-600",
    iconBg: "bg-gold-50",
  },
  {
    href: "/dashboard/policies",
    icon: Shield,
    title: "Policies",
    description: "Manage access control policies",
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
  },
  {
    href: "/dashboard/agents",
    icon: Users,
    title: "Agents",
    description: "View registered AI agents and their status",
    iconColor: "text-teal-500",
    iconBg: "bg-teal-50",
  },
  {
    href: "/dashboard/audit",
    icon: ClipboardList,
    title: "Audit Trail",
    description: "Review the global activity trail",
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
  },
  {
    href: "/dashboard/upload",
    icon: Upload,
    title: "Upload",
    description: "Add a new dataset with license",
    iconColor: "text-navy-600",
    iconBg: "bg-navy-50",
  },
];

const guestStats = [
  { label: "Total Datasets", icon: Database, cardClass: "stat-card-gold", iconColor: "text-gold-500" },
  { label: "Registered Agents", icon: Users, cardClass: "stat-card-teal", iconColor: "text-teal-500" },
  { label: "Active Agents", icon: Activity, cardClass: "stat-card-violet", iconColor: "text-violet-500" },
  { label: "Audit Events", icon: ClipboardList, cardClass: "stat-card-navy", iconColor: "text-navy-500" },
];

export default function OverviewPage() {
  const { isAuthenticated } = useAuthGuard();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchDashboardStats(),
      fetchAllAuditLogs({ limit: 5 }),
    ])
      .then(([stats, logs]) => {
        if (cancelled) return;
        setData({
          totalDatasets: stats.totalDatasets,
          registeredAgents: stats.registeredAgents,
          activeAgents: stats.activeAgents,
          recentLogs: logs as RecentLog[],
          error: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setData({
          totalDatasets: 0,
          registeredAgents: 0,
          activeAgents: 0,
          recentLogs: [],
          error: true,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const healthItems = [
    { label: "Shelby Protocol", status: !data?.error, icon: Wifi },
    { label: "Evidence Engine", status: !data?.error, icon: Shield },
    { label: "Audit System", status: !data?.error, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <FadeInWrapper delay={0}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 px-6 py-8 sm:px-8">
          <svg
            className="pointer-events-none absolute -right-8 -top-8 h-[280px] w-[280px] text-white/[0.03]"
            viewBox="0 0 400 800"
            fill="none"
          >
            <line x1="200" y1="0" x2="200" y2="800" stroke="currentColor" strokeWidth="2" />
            <line x1="200" y1="100" x2="80" y2="300" stroke="currentColor" strokeWidth="1.5" />
            <line x1="200" y1="100" x2="320" y2="300" stroke="currentColor" strokeWidth="1.5" />
            <line x1="200" y1="400" x2="60" y2="600" stroke="currentColor" strokeWidth="1" />
            <line x1="200" y1="400" x2="340" y2="600" stroke="currentColor" strokeWidth="1" />
          </svg>
          <div className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-gold-500/10 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-10 right-20 h-32 w-32 rounded-full bg-teal-500/10 blur-[60px]" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <Shield className="h-5 w-5 text-gold-400" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
                    Welcome to Forsety
                  </h1>
                  <p className="mt-0.5 text-sm text-navy-300">
                    Evidence layer for licensed AI data
                  </p>
                </div>
              </div>
            </div>

            {isAuthenticated && (
              <div className="flex items-center gap-4">
                {healthItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 backdrop-blur-sm"
                  >
                    {item.status ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                    )}
                    <item.icon className="h-3.5 w-3.5 text-navy-400" />
                    <span className="hidden text-xs font-medium text-navy-300 sm:inline">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </FadeInWrapper>

      {/* Error Banner (authenticated only) */}
      {isAuthenticated && data?.error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            Unable to load workspace data. Stats may be incomplete.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !isAuthenticated ? (
        <StaggerWrapper className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {guestStats.map((stat) => (
            <StaggerItemWrapper key={stat.label}>
              <GuestStatCard
                label={stat.label}
                icon={stat.icon}
                cardClass={stat.cardClass}
                iconColor={stat.iconColor}
              />
            </StaggerItemWrapper>
          ))}
        </StaggerWrapper>
      ) : data ? (
        <StaggerWrapper className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total Datasets", value: data.totalDatasets, icon: Database, cardClass: "stat-card-gold", iconBgClass: "bg-gold-50", iconColor: "text-gold-500" },
            { label: "Registered Agents", value: data.registeredAgents, icon: Users, cardClass: "stat-card-teal", iconBgClass: "bg-teal-50", iconColor: "text-teal-500" },
            { label: "Active Agents", value: data.activeAgents, icon: Activity, cardClass: "stat-card-violet", iconBgClass: "bg-violet-50", iconColor: "text-violet-500" },
            { label: "Audit Events", value: data.recentLogs.length, icon: ClipboardList, cardClass: "stat-card-navy", iconBgClass: "bg-navy-50", iconColor: "text-navy-500" },
          ].map((stat) => (
            <StaggerItemWrapper key={stat.label}>
              <StatCard
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                cardClass={stat.cardClass}
                iconBgClass={stat.iconBgClass}
                iconColor={stat.iconColor}
              />
            </StaggerItemWrapper>
          ))}
        </StaggerWrapper>
      ) : null}

      {/* Two-column: Quick Actions + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <FadeInWrapper delay={0.15}>
            <h2 className="mb-4 font-display text-base font-semibold text-foreground">
              Quick Actions
            </h2>
          </FadeInWrapper>

          <StaggerWrapper className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1" staggerDelay={0.08}>
            {quickActions.map((action) => (
              <StaggerItemWrapper key={action.href}>
                <Link href={action.href} className="group block">
                  <Card className="glass-card-premium rounded-xl transition-all duration-300 hover:shadow-md">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${action.iconBg}`}>
                        <action.icon className={`h-4 w-4 ${action.iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-gold-600">
                          {action.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold-500" />
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItemWrapper>
            ))}
          </StaggerWrapper>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3">
          <FadeInWrapper delay={0.2}>
            <Card className="overflow-hidden rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent pb-4">
                <CardTitle className="font-display text-base font-semibold">
                  Recent Activity
                </CardTitle>
                <Link
                  href="/dashboard/audit"
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-gold-600"
                >
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {!isAuthenticated ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60">
                      <Activity className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">Connect wallet to see activity</p>
                  </div>
                ) : loading ? (
                  <div className="space-y-3 p-6">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                ) : !data || data.recentLogs.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60">
                      <Activity className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                    <p className="text-xs text-muted-foreground/60">
                      Activity will appear here once agents start interacting
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {data.recentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between px-5 py-3.5 transition-all duration-200 hover:bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
                            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {log.toolName ?? log.action}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {log.agentId
                                ? `Agent ${log.agentId.slice(0, 8)}...`
                                : "Anonymous"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              (statusColor[log.status] as "default" | "destructive") ?? "secondary"
                            }
                          >
                            {log.status}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {formatRelativeTime(log.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeInWrapper>
        </div>
      </div>

    </div>
  );
}
