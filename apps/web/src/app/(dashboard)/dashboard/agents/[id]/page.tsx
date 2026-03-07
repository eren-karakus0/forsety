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
import { ChevronRight } from "lucide-react";

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
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<AgentData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAgentDetail(id),
      fetchAgentAuditLogs(id, { limit: 20 }),
    ])
      .then(([detail, logs]) => {
        setData(detail as AgentData | null);
        setAuditLogs(logs);
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-navy-600">Agent not found</p>
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
      <div className="mb-6 flex items-center gap-2 text-sm text-navy-400">
        <Link href="/dashboard" className="transition-colors hover:text-navy-600">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/dashboard/agents" className="transition-colors hover:text-navy-600">
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-navy-700">{agent.name}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Agent info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Card */}
          <Card className="border-navy-200/60">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-navy-800">
                    {agent.name}
                  </h1>
                  {agent.description && (
                    <p className="mt-1 text-sm text-navy-500">{agent.description}</p>
                  )}
                </div>
                <Badge variant={agent.isActive ? "default" : "destructive"}>
                  {agent.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="rounded-lg bg-navy-50/50 p-4 space-y-3">
                <div className="flex justify-between border-b border-navy-100/80 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-navy-400">Agent ID</span>
                  <span className="font-mono text-xs text-navy-600 break-all">{agent.id}</span>
                </div>
                <div className="flex justify-between border-b border-navy-100/80 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-navy-400">Owner</span>
                  <span className="font-mono text-xs text-navy-600">{agent.ownerAddress}</span>
                </div>
                <div className="flex justify-between border-b border-navy-100/80 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-navy-400">Created</span>
                  <span className="text-sm text-navy-800">
                    {new Date(agent.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-navy-400">Last Seen</span>
                  <span className="text-sm text-navy-800">
                    {agent.lastSeenAt
                      ? new Date(agent.lastSeenAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                      : "Never"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card className="border-navy-200/60">
            <CardContent className="pt-6">
              <h2 className="mb-4 font-display text-base font-semibold text-navy-800">
                Permissions
              </h2>
              <div className="flex flex-wrap gap-2">
                {agent.permissions.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
              <Separator className="my-4" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-navy-400">
                Allowed Datasets
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {agent.allowedDatasets.map((d, i) => (
                  <Badge key={i} variant="secondary" className="bg-gold-100 text-gold-800 font-mono text-xs">
                    {d === "*" ? "All Datasets" : `${d.slice(0, 8)}...`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card className="border-navy-200/60">
            <CardHeader className="border-b border-navy-100 bg-navy-50/50 flex-row items-center justify-between">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
              <Button variant="link" size="sm" asChild>
                <Link href={`/dashboard/audit?agentId=${id}`}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-navy-400">
                  No activity yet
                </div>
              ) : (
                <div className="divide-y divide-navy-100/80">
                  {auditLogs.map((log: AuditLogEntry) => (
                    <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                      <Badge variant={statusVariant[log.status] ?? "secondary"} className="text-[10px]">
                        {log.status}
                      </Badge>
                      <span className="text-xs font-medium text-navy-700">
                        {log.action}
                      </span>
                      {log.toolName && (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {log.toolName}
                        </Badge>
                      )}
                      <span className="ml-auto text-[10px] text-navy-400">
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
          <Card className="border-gold-300/60 bg-gradient-to-b from-gold-50/60 to-white">
            <CardContent className="pt-6">
              <h2 className="mb-4 font-display text-base font-semibold text-navy-800">
                Audit Summary
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-navy-500">Total Actions</span>
                  <span className="font-display text-lg font-bold text-navy-800">
                    {auditSummary.totalActions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-navy-500">Successful</span>
                  <span className="font-display text-lg font-bold text-emerald-600">
                    {auditSummary.successCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-navy-500">Denied</span>
                  <span className="font-display text-lg font-bold text-red-600">
                    {auditSummary.deniedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-navy-500">Errors</span>
                  <span className="font-display text-lg font-bold text-amber-600">
                    {auditSummary.errorCount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          {agent.metadata && Object.keys(agent.metadata).length > 0 && (
            <Card className="border-navy-200/60 overflow-hidden">
              <CardHeader className="border-b border-navy-100 bg-navy-50/50 py-2.5">
                <CardTitle className="text-xs uppercase tracking-wider">
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="max-h-48 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-navy-600">
                  {JSON.stringify(agent.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
