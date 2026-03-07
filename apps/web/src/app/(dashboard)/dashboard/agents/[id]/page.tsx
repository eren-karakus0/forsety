"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchAgentDetail, fetchAgentAuditLogs } from "../../actions";

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

const statusColors: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-700",
  error: "bg-amber-100 text-amber-700",
};

export default function AgentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<AgentData | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-navy-400" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
        </svg>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-navy-600">Agent not found</p>
        <Link href="/dashboard/agents" className="text-sm text-gold-600 hover:underline">
          Back to agents
        </Link>
      </div>
    );
  }

  const { agent, auditSummary } = data;

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-navy-400">
        <Link href="/dashboard" className="transition-colors hover:text-navy-600">Dashboard</Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        <Link href="/dashboard/agents" className="transition-colors hover:text-navy-600">Agents</Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        <span className="text-navy-700">{agent.name}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Agent info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Card */}
          <div className="rounded-xl border border-navy-200/60 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-navy-800">{agent.name}</h1>
                {agent.description && (
                  <p className="mt-1 text-sm text-navy-500">{agent.description}</p>
                )}
              </div>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                agent.isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}>
                <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${agent.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                {agent.isActive ? "Active" : "Inactive"}
              </span>
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
                  {agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Never"}
                </span>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="rounded-xl border border-navy-200/60 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display text-base font-semibold text-navy-800">Permissions</h2>
            <div className="flex flex-wrap gap-2">
              {agent.permissions.map((p) => (
                <span key={p} className="rounded-lg border border-navy-200 bg-navy-50 px-3 py-1.5 text-xs font-medium text-navy-700">
                  {p}
                </span>
              ))}
            </div>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-navy-400">Allowed Datasets</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {agent.allowedDatasets.map((d, i) => (
                <span key={i} className="rounded bg-gold-100 px-2 py-0.5 font-mono text-xs text-gold-800">
                  {d === "*" ? "All Datasets" : `${d.slice(0, 8)}...`}
                </span>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div className="rounded-xl border border-navy-200/60 bg-white shadow-sm">
            <div className="border-b border-navy-100 bg-navy-50/50 px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy-700">Recent Activity</h2>
              <Link href={`/dashboard/audit?agentId=${id}`} className="text-xs text-gold-600 hover:underline">
                View all
              </Link>
            </div>
            {auditLogs.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-navy-400">No activity yet</div>
            ) : (
              <div className="divide-y divide-navy-100/80">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors[log.status] ?? "bg-navy-100 text-navy-600"}`}>
                      {log.status}
                    </span>
                    <span className="text-xs font-medium text-navy-700">{log.action}</span>
                    {log.toolName && (
                      <span className="rounded bg-navy-100 px-1.5 py-0.5 font-mono text-[10px] text-navy-500">
                        {log.toolName}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-navy-400">
                      {new Date(log.timestamp).toLocaleString("en-US", { timeStyle: "short", dateStyle: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Audit Summary */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gold-300/60 bg-gradient-to-b from-gold-50/60 to-white p-6 shadow-sm">
            <h2 className="mb-4 font-display text-base font-semibold text-navy-800">Audit Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-navy-500">Total Actions</span>
                <span className="font-display text-lg font-bold text-navy-800">{auditSummary.totalActions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-navy-500">Successful</span>
                <span className="font-display text-lg font-bold text-emerald-600">{auditSummary.successCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-navy-500">Denied</span>
                <span className="font-display text-lg font-bold text-red-600">{auditSummary.deniedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-navy-500">Errors</span>
                <span className="font-display text-lg font-bold text-amber-600">{auditSummary.errorCount}</span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          {agent.metadata && Object.keys(agent.metadata).length > 0 && (
            <div className="rounded-xl border border-navy-200/60 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-navy-100 bg-navy-50/50 px-4 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-navy-500">Metadata</span>
              </div>
              <pre className="max-h-48 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-navy-600">
                {JSON.stringify(agent.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
