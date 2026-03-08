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
      accent: "gold" as const,
    },
    {
      label: "Registered Agents",
      value: data.registeredAgents.toString(),
      icon: Users,
      accent: "teal" as const,
    },
    {
      label: "Active Agents",
      value: data.activeAgents.toString(),
      icon: Activity,
      accent: "violet" as const,
    },
    {
      label: "Audit Events",
      value: data.auditEvents.toString(),
      icon: ClipboardList,
      accent: "navy" as const,
    },
  ];

  const quickActions = [
    {
      href: "/dashboard/datasets",
      icon: Database,
      title: "Datasets",
      description: "Browse and manage your licensed datasets",
      accent: "gold" as const,
    },
    {
      href: "/dashboard/agents",
      icon: Users,
      title: "Agents",
      description: "View registered AI agents and their status",
      accent: "teal" as const,
    },
    {
      href: "/dashboard/audit",
      icon: ClipboardList,
      title: "Audit Trail",
      description: "Review the global activity trail",
      accent: "violet" as const,
    },
    {
      href: "/dashboard/upload",
      icon: Upload,
      title: "Upload",
      description: "Add a new dataset with license",
      accent: "navy" as const,
    },
  ];

  const accentBorder: Record<string, string> = {
    gold: "border-l-gold-500",
    teal: "border-l-teal-500",
    violet: "border-l-violet-500",
    navy: "border-l-navy-500",
  };

  const accentGlow: Record<string, string> = {
    gold: "from-gold-500/10 to-transparent",
    teal: "from-teal-500/10 to-transparent",
    violet: "from-violet-500/10 to-transparent",
    navy: "from-navy-500/10 to-transparent",
  };

  const accentIcon: Record<string, string> = {
    gold: "text-gold-500",
    teal: "text-teal-500",
    violet: "text-violet-500",
    navy: "text-navy-500",
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <FadeInWrapper delay={0}>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your Forsety workspace
          </p>
        </div>
      </FadeInWrapper>

      {/* Error Banner */}
      {data.error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
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
              className={`border-l-4 ${accentBorder[stat.accent]} bg-gradient-to-br ${accentGlow[stat.accent]} transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}
            >
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <stat.icon className={`h-4 w-4 ${accentIcon[stat.accent]}`} />
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
              <Card className="h-full transition-all duration-200 hover:border-primary/30 hover:shadow-md gradient-border-animated">
                <CardContent className="flex flex-col gap-3 pt-5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${accentGlow[action.accent]}`}
                  >
                    <action.icon
                      className={`h-5 w-5 ${accentIcon[action.accent]}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {action.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </StaggerItemWrapper>
        ))}
      </StaggerWrapper>

      {/* Recent Activity */}
      {data.recentLogs.length > 0 && (
        <FadeInWrapper delay={0.2}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="font-display text-lg font-semibold">
                Recent Activity
              </CardTitle>
              <Link
                href="/dashboard/audit"
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                View All
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {data.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 transition-all duration-200 hover:bg-muted/30 hover:translate-x-1"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {log.toolName ?? log.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
                      <span className="text-xs text-muted-foreground">
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
