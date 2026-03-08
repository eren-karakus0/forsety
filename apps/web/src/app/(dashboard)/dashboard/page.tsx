import Link from "next/link";
import { getForsetyClient } from "@/lib/forsety";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
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
} from "lucide-react";
import {
  FadeInWrapper,
  StaggerWrapper,
  StaggerItemWrapper,
  CounterWrapper,
} from "./overview-animations";

export const dynamic = "force-dynamic";

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
  auditEvents: number;
  recentLogs: RecentLog[];
  error: boolean;
}

async function getOverviewData(): Promise<OverviewData> {
  try {
    const client = getForsetyClient();
    const [datasets, agents, auditCount, recentLogs] = await Promise.all([
      client.datasets.list(),
      client.agents.list(),
      client.agentAudit.countAll(),
      client.agentAudit.listAll({ limit: 5 }),
    ]);

    return {
      totalDatasets: datasets.length,
      registeredAgents: agents.length,
      activeAgents: agents.filter((a) => a.isActive).length,
      auditEvents: auditCount,
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        agentId: l.agentId,
        action: l.action,
        toolName: l.toolName,
        status: l.status,
        timestamp: l.timestamp.toISOString(),
      })),
      error: false,
    };
  } catch {
    return {
      totalDatasets: 0,
      registeredAgents: 0,
      activeAgents: 0,
      auditEvents: 0,
      recentLogs: [],
      error: true,
    };
  }
}

const statusColor: Record<string, string> = {
  success: "default",
  denied: "destructive",
  error: "destructive",
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function OverviewPage() {
  const data = await getOverviewData();

  const stats = [
    {
      label: "Total Datasets",
      value: data.totalDatasets.toString(),
      icon: Database,
      cardClass: "stat-card-gold",
      iconColor: "text-gold-500",
    },
    {
      label: "Registered Agents",
      value: data.registeredAgents.toString(),
      icon: Users,
      cardClass: "stat-card-teal",
      iconColor: "text-teal-500",
    },
    {
      label: "Active Agents",
      value: data.activeAgents.toString(),
      icon: Activity,
      cardClass: "stat-card-violet",
      iconColor: "text-violet-500",
    },
    {
      label: "Audit Events",
      value: data.auditEvents.toString(),
      icon: ClipboardList,
      cardClass: "stat-card-navy",
      iconColor: "text-navy-500",
    },
  ];

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
      iconColor: "text-violet-500",
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

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <FadeInWrapper delay={0}>
        <div className="page-header-accent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500/10 to-teal-500/10">
              <Shield className="h-5 w-5 text-gold-500" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Overview of your Forsety workspace
              </p>
            </div>
          </div>
        </div>
      </FadeInWrapper>

      {/* Error Banner */}
      {data.error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            Unable to load workspace data. Stats may be incomplete.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <StaggerWrapper className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <StaggerItemWrapper key={stat.label}>
            <Card
              className={`${stat.cardClass} rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}
            >
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
                <div className="mt-2 font-display text-2xl font-bold text-foreground">
                  <CounterWrapper
                    value={stat.value}
                    className="font-display text-2xl font-bold"
                  />
                </div>
              </CardContent>
            </Card>
          </StaggerItemWrapper>
        ))}
      </StaggerWrapper>

      {/* Quick Actions */}
      <FadeInWrapper delay={0.15}>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
          Quick Actions
        </h2>
      </FadeInWrapper>

      <StaggerWrapper
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        staggerDelay={0.08}
      >
        {quickActions.map((action) => (
          <StaggerItemWrapper key={action.href}>
            <Link href={action.href} className="group block">
              <Card className="glass-card-premium h-full rounded-xl transition-all duration-300 hover:shadow-lg">
                <CardContent className="flex flex-col gap-3 pt-5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.iconBg}`}
                  >
                    <action.icon
                      className={`h-5 w-5 ${action.iconColor}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-gold-600">
                      {action.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="mt-auto h-3.5 w-3.5 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold-500" />
                </CardContent>
              </Card>
            </Link>
          </StaggerItemWrapper>
        ))}
      </StaggerWrapper>

      {/* Recent Activity */}
      {data.recentLogs.length > 0 && (
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
                          (statusColor[log.status] as "default" | "destructive") ??
                          "secondary"
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
            </CardContent>
          </Card>
        </FadeInWrapper>
      )}
    </div>
  );
}
