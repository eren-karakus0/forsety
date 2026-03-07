"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchAgents, fetchAgentAuditLogs } from "../actions";

interface AuditLog {
  id: string;
  agentId: string;
  action: string;
  toolName: string | null;
  resourceType: string | null;
  resourceId: string | null;
  status: string;
  errorMessage: string | null;
  durationMs: number | null;
  timestamp: string;
}

interface AgentInfo {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-700",
  error: "bg-amber-100 text-amber-700",
};

export default function AuditPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-navy-400" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
        </svg>
      </div>
    }>
      <AuditPageContent />
    </Suspense>
  );
}

function AuditPageContent() {
  const searchParams = useSearchParams();
  const filterAgentId = searchParams.get("agentId");

  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>(filterAgentId ?? "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchAgents().then((a) =>
      setAgents(a.map((ag: any) => ({ id: ag.id, name: ag.name })))
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    if (selectedAgent === "all") {
      // Fetch from all agents
      Promise.all(
        agents.map((a) =>
          fetchAgentAuditLogs(a.id, {
            limit: 50,
            status: statusFilter !== "all" ? statusFilter : undefined,
          })
        )
      )
        .then((results) => {
          const all = results
            .flat()
            .sort(
              (a: any, b: any) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            )
            .slice(0, 100);
          setLogs(all as AuditLog[]);
        })
        .finally(() => setLoading(false));
    } else {
      fetchAgentAuditLogs(selectedAgent, {
        limit: 100,
        status: statusFilter !== "all" ? statusFilter : undefined,
      })
        .then((l) => setLogs(l as AuditLog[]))
        .finally(() => setLoading(false));
    }
  }, [selectedAgent, statusFilter, agents]);

  const getAgentName = (agentId: string) =>
    agents.find((a) => a.id === agentId)?.name ?? agentId.slice(0, 8);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy-800">
            Audit Trail
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            Complete audit log of all agent activities
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-700 shadow-sm transition-all hover:bg-navy-50 disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export JSON
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-700 focus:border-navy-400 focus:outline-none"
        >
          <option value="all">All Agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-700 focus:border-navy-400 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="denied">Denied</option>
          <option value="error">Error</option>
        </select>

        <div className="ml-auto text-sm text-navy-500 self-center">
          {logs.length} entries
        </div>
      </div>

      {/* Log Table */}
      <div className="overflow-hidden rounded-xl border border-navy-200/60 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="h-6 w-6 animate-spin text-navy-400" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
          </div>
        ) : logs.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-navy-400">No audit logs found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">Tool</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">Resource</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-navy-500">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100/80">
              {logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-navy-50/30">
                  <td className="px-4 py-3 text-xs text-navy-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/agents/${log.agentId}`}
                      className="text-xs font-medium text-navy-700 hover:text-gold-600 transition-colors"
                    >
                      {getAgentName(log.agentId)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-navy-700">
                    {log.action}
                  </td>
                  <td className="px-4 py-3">
                    {log.toolName ? (
                      <span className="rounded bg-navy-100 px-1.5 py-0.5 font-mono text-[10px] text-navy-600">
                        {log.toolName}
                      </span>
                    ) : (
                      <span className="text-xs text-navy-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.resourceType ? (
                      <span className="text-xs text-navy-600">
                        {log.resourceType}
                        {log.resourceId && (
                          <span className="ml-1 font-mono text-[10px] text-navy-400">
                            {log.resourceId.slice(0, 8)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-navy-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors[log.status] ?? "bg-navy-100 text-navy-600"}`}>
                      {log.status}
                    </span>
                    {log.errorMessage && (
                      <p className="mt-0.5 text-[10px] text-red-500 truncate max-w-[120px]" title={log.errorMessage}>
                        {log.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-navy-500">
                    {log.durationMs != null ? `${log.durationMs}ms` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
