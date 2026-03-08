"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAgents } from "../actions";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@forsety/ui";
import { Users, ArrowRight, Activity, UserX } from "lucide-react";

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
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const activeCount = agents.filter((a) => a.isActive).length;
  const inactiveCount = agents.filter((a) => !a.isActive).length;
  const activePercent = agents.length > 0 ? Math.round((activeCount / agents.length) * 100) : 0;

  // Collect all unique permissions for distribution
  const permissionCounts: Record<string, number> = {};
  agents.forEach((a) => {
    a.permissions.forEach((p) => {
      permissionCounts[p] = (permissionCounts[p] ?? 0) + 1;
    });
  });
  const topPermissions = Object.entries(permissionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header-accent">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
            <Users className="h-5 w-5 text-teal-500" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Agents
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Registered AI agents with RecallVault access
            </p>
          </div>
        </div>
      </div>

      {/* Stats + Distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="stat-card-teal rounded-xl transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Agents
              </p>
              <Users className="h-4 w-4 text-teal-500" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              {agents.length}
            </p>
          </CardContent>
        </Card>
        <Card className="stat-card-gold rounded-xl transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active
              </p>
              <Activity className="h-4 w-4 text-gold-500" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-500">
              {activeCount}
            </p>
            {/* Status Distribution Bar */}
            {agents.length > 0 && (
              <div className="mt-3">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${activePercent}%` }}
                  />
                  <div
                    className="bg-red-400/60"
                    style={{ width: `${100 - activePercent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {activePercent}% active
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="stat-card-violet rounded-xl transition-all duration-300 hover:shadow-md">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Inactive
              </p>
              <UserX className="h-4 w-4 text-violet-500" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              {inactiveCount}
            </p>
            {/* Top Permissions */}
            {topPermissions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {topPermissions.map(([perm, count]) => (
                  <span
                    key={perm}
                    className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600"
                  >
                    {perm} ({count})
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="table-header-row border-border/40 hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Owner
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Permissions
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Last Seen
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-violet-50">
                      <Users className="h-6 w-6 text-teal-400" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      No agents registered
                    </p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Register agents via the API to start tracking their access and memory operations
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => (
                <TableRow key={agent.id} className="group border-border/30 transition-colors hover:bg-muted/20">
                  <TableCell>
                    <Link href={`/dashboard/agents/${agent.id}`}>
                      <span className="text-sm font-medium text-foreground transition-colors group-hover:text-gold-600">
                        {agent.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                        {agent.id.slice(0, 8)}...
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {agent.ownerAddress.slice(0, 10)}...
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {agent.permissions.slice(0, 3).map((p) => (
                        <Badge
                          key={p}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {p}
                        </Badge>
                      ))}
                      {agent.permissions.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{agent.permissions.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          agent.isActive
                            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                            : "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.2)]"
                        }`}
                      />
                      <Badge
                        variant={agent.isActive ? "default" : "destructive"}
                      >
                        {agent.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {agent.lastSeenAt
                      ? new Date(agent.lastSeenAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild className="hover:border-gold-500/30 hover:text-gold-600">
                      <Link href={`/dashboard/agents/${agent.id}`}>
                        View
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
