"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAgents } from "../actions";

interface AgentRow {
  id: string;
  name: string;
  ownerAddress: string;
  permissions: string[];
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents()
      .then((a) => setAgents(a as AgentRow[]))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy-800">
            Agents
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            Registered AI agents with RecallVault access
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-navy-200/60 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-navy-400">Total Agents</p>
          <p className="mt-2 font-display text-2xl font-bold text-navy-800">{agents.length}</p>
        </div>
        <div className="rounded-xl border border-navy-200/60 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-navy-400">Active</p>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-600">
            {agents.filter((a) => a.isActive).length}
          </p>
        </div>
        <div className="rounded-xl border border-gold-300/60 bg-gradient-to-br from-gold-50/80 to-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-navy-400">Inactive</p>
          <p className="mt-2 font-display text-2xl font-bold text-navy-800">
            {agents.filter((a) => !a.isActive).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-navy-200/60 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">Owner</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">Permissions</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-500">Last Seen</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-navy-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100/80">
            {agents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-navy-400">
                        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" strokeLinecap="round" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-navy-600">No agents registered</p>
                    <p className="text-xs text-navy-400">Register agents via the API to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="group transition-colors hover:bg-navy-50/30">
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/agents/${agent.id}`} className="group/link">
                      <span className="text-sm font-medium text-navy-800 group-hover/link:text-gold-600 transition-colors">
                        {agent.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-navy-400">
                        {agent.id.slice(0, 8)}...
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-navy-600">
                      {agent.ownerAddress.slice(0, 10)}...
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {agent.permissions.slice(0, 3).map((p) => (
                        <span key={p} className="rounded bg-navy-100 px-1.5 py-0.5 text-[10px] font-medium text-navy-600">
                          {p}
                        </span>
                      ))}
                      {agent.permissions.length > 3 && (
                        <span className="text-[10px] text-navy-400">+{agent.permissions.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      agent.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}>
                      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${agent.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                      {agent.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-navy-500">
                    {agent.lastSeenAt
                      ? new Date(agent.lastSeenAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "Never"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/dashboard/agents/${agent.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-navy-200 px-2.5 py-1 text-xs font-medium text-navy-600 transition-all hover:border-navy-300 hover:bg-navy-50 hover:text-navy-800"
                    >
                      View
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
