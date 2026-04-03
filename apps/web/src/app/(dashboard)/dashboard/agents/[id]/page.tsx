"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchAgentDetail, fetchAgentAuditLogs } from "../../actions";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Separator,
} from "@forsety/ui";
import { ChevronRight, Users, Settings } from "lucide-react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { ConnectWalletCTA } from "../../../components/connect-wallet-cta";
import { EditAgentDialog } from "./edit-agent-dialog";

interface AgentData {
  agent: {
    id: string;
    name: string;
    description: string | null;
    ownerAddress: string;
    permissions: string[];
    allowedDatasets: string[];
    metadata: Record<string, unknown> | null;
    isActive: boolean;
    lastSeenAt: string | null;
    createdAt: string;
  };
  auditSummary: {
    totalActions: number;
    successCount: number;
    deniedCount: number;
    errorCount: number;
    recentActions: Array<{
      action: string;
      status: string;
      timestamp: string;
    }>;
  };
}

interface AuditLogEntry {
  id: string;
  action: string;
  toolName: string | null;
  status: string;
  errorMessage: string | null;
  timestamp: string;
}

const statusVariant: Record<string, "default" | "destructive" | "secondary"> = {
  success: "default",
  denied: "destructive",
  error: "secondary",
};

export default function AgentDetailPage() {
  const { isAuthenticated } = useAuthGuard();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<AgentData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  function loadData() {
    Promise.all([
      fetchAgentDetail(id),
      fetchAgentAuditLogs(id, { limit: 20 }),
    ])
      .then(([detail, logs]) => {
        setData(detail as AgentData | null);
        setAuditLogs(logs);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    loadData();
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ConnectWalletCTA
        title="Connect to view agent details"
        description="Connect your wallet to access agent information, permissions, and audit history"
        icon={Users}
        variant="full-page"
      />
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50">
          <Users className="h-5 w-5 text-teal-400" />
        </div>
        <p className="text-sm font-medium text-foreground">Agent not found</p>
        <Button variant="link" asChild>
          <Link href="/dashboard/agents">Back to agents</Link>
        </Button>
      </div>
    );
  }

  const { agent, auditSummary } = data;

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="transition-colors hover:text-gold-600">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/dashboard/agents" className="transition-colors hover:text-gold-600">
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{agent.name}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Agent info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Card */}
          <Card className="overflow-hidden rounded-xl">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                    <Users className="h-5 w-5 text-teal-500" />
                  </div>
                  <div>
                    <h1 className="font-display text-xl font-bold text-foreground">
                      {agent.name}
                    </h1>
                    {agent.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{agent.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEditOpen(true)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <div
                    className={`h-2 w-2 rounded-full ${
                      agent.isActive
                        ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                        : "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.2)]"
                    }`}
                  />
                  <Badge variant={agent.isActive ? "default" : "destructive"}>
                    {agent.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 p-4 space-y-3">
                <div className="flex justify-between border-b border-border/40 pb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Agent ID</span>
                  <span className="font-mono text-xs text-muted-foreground break-all">{agent.id}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Owner</span>
                  <span className="font-mono text-xs text-muted-foreground">{agent.ownerAddress}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</span>
                  <span className="text-sm text-foreground">
                    {new Date(agent.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last Seen</span>
                  <span className="text-sm text-foreground">
                    {agent.lastSeenAt
                      ? new Date(agent.lastSeenAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                      : "Never"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card className="rounded-xl">
            <CardContent className="pt-6">
              <h2 className="mb-4 font-display text-base font-semibold text-foreground">
                Permissions
              </h2>
              <div className="flex flex-wrap gap-2">
                {agent.permissions.map((p) => (
                  <Badge key={p} variant="outline" className="rounded-lg text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
              <Separator className="my-4" />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Allowed Datasets
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {agent.allowedDatasets.map((d, i) => (
                  <Badge key={i} variant="secondary" className="font-mono text-xs">
                    {d === "*" ? "All Datasets" : `${d.slice(0, 8)}...`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card className="overflow-hidden rounded-xl">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              <Button variant="link" size="sm" asChild className="text-gold-600">
                <Link href={`/dashboard/audit?agentId=${id}`}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-5 py-12">
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {auditLogs.map((log: AuditLogEntry) => (
                    <div key={log.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20">
                      <Badge variant={statusVariant[log.status] ?? "secondary"} className="text-[10px]">
                        {log.status}
                      </Badge>
                      <span className="text-xs font-medium text-foreground">
                        {log.action}
                      </span>
                      {log.toolName && (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {log.toolName}
                        </Badge>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString("en-US", {
                          timeStyle: "short",
                          dateStyle: "short",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Audit Summary */}
        <div className="space-y-6">
          <Card className="stat-card-gold rounded-xl">
            <CardContent className="pt-6">
              <h2 className="mb-4 font-display text-base font-semibold text-foreground">
                Audit Summary
              </h2>

              {/* SVG Pie Chart */}
              {auditSummary.totalActions > 0 && (() => {
                const total = auditSummary.totalActions || 1;
                const successPct = auditSummary.successCount / total;
                const deniedPct = auditSummary.deniedCount / total;
                const r = 36; const c = 2 * Math.PI * r;
                return (
                  <div className="flex justify-center mb-4">
                    <svg width="88" height="88" viewBox="0 0 88 88">
                      <circle cx="44" cy="44" r={r} fill="none" stroke="#f59e0b" strokeWidth="12"
                        strokeDasharray={`${c * (1 - successPct - deniedPct)} ${c * (successPct + deniedPct)}`}
                        strokeDashoffset={c * 0.25} />
                      <circle cx="44" cy="44" r={r} fill="none" stroke="#ef4444" strokeWidth="12"
                        strokeDasharray={`${c * deniedPct} ${c * (1 - deniedPct)}`}
                        strokeDashoffset={c * 0.25 - c * (1 - successPct - deniedPct)} />
                      <circle cx="44" cy="44" r={r} fill="none" stroke="#10b981" strokeWidth="12"
                        strokeDasharray={`${c * successPct} ${c * (1 - successPct)}`}
                        strokeDashoffset={c * 0.25 - c * (1 - successPct)} />
                      <text x="44" y="44" textAnchor="middle" dy="4" className="fill-foreground text-xs font-bold">
                        {total}
                      </text>
                    </svg>
                  </div>
                );
              })()}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Successful
                  </span>
                  <span className="font-display text-lg font-bold text-emerald-500">
                    {auditSummary.successCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Denied
                  </span>
                  <span className="font-display text-lg font-bold text-red-500">
                    {auditSummary.deniedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Errors
                  </span>
                  <span className="font-display text-lg font-bold text-amber-500">
                    {auditSummary.errorCount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          {agent.metadata && Object.keys(agent.metadata).length > 0 && (
            <Card className="overflow-hidden rounded-xl">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent py-2.5">
                <CardTitle className="text-[11px] uppercase tracking-wider">
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="max-h-48 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {JSON.stringify(agent.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <EditAgentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        agent={agent}
        onUpdated={loadData}
      />
    </div>
  );
}
