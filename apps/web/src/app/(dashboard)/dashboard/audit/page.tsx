"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchAgents, fetchAllAuditLogs } from "../actions";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forsety/ui";
import { Download, ClipboardList, CheckCircle2, ShieldAlert, AlertCircle } from "lucide-react";

interface AuditLog {
  id: string;
  agentId: string | null;
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

const statusVariant: Record<string, "default" | "destructive" | "secondary"> = {
  success: "default",
  denied: "destructive",
  error: "secondary",
};

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-36" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      }
    >
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
      setAgents(a.map((ag: { id: string; name: string }) => ({ id: ag.id, name: ag.name })))
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    const filters: { agentId?: string | null; status?: string; limit?: number } = {
      limit: 100,
    };

    if (selectedAgent === "anonymous") {
      filters.agentId = null;
    } else if (selectedAgent !== "all") {
      filters.agentId = selectedAgent;
    }

    if (statusFilter !== "all") {
      filters.status = statusFilter;
    }

    fetchAllAuditLogs(filters)
      .then((l) => setLogs(l as AuditLog[]))
      .finally(() => setLoading(false));
  }, [selectedAgent, statusFilter]);

  const getAgentName = (agentId: string | null) =>
    agentId ? (agents.find((a) => a.id === agentId)?.name ?? agentId.slice(0, 8)) : "Anonymous";

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
        <div className="page-header-accent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <ClipboardList className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Audit Trail
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Complete audit log of all agent activities
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={logs.length === 0}
          className="hover:border-gold-500/30 hover:text-gold-600"
        >
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="w-[200px] rounded-lg">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            <SelectItem value="anonymous">Anonymous (Auth Failed)</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] rounded-lg">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-gold-400 to-teal-400" />
          {logs.length} entries
        </div>
      </div>

      {/* Status Breakdown */}
      {!loading && logs.length > 0 && (() => {
        const successCount = logs.filter((l) => l.status === "success").length;
        const deniedCount = logs.filter((l) => l.status === "denied").length;
        const errorCount = logs.filter((l) => l.status === "error").length;
        const avgDuration = (() => {
          const withDuration = logs.filter((l) => l.durationMs != null);
          if (withDuration.length === 0) return null;
          return Math.round(withDuration.reduce((s, l) => s + (l.durationMs ?? 0), 0) / withDuration.length);
        })();

        return (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="stat-card-teal rounded-xl">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Success
                  </p>
                  <p className="font-display text-lg font-bold text-emerald-600">
                    {successCount}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="stat-card-gold rounded-xl">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Denied
                  </p>
                  <p className="font-display text-lg font-bold text-red-500">
                    {deniedCount}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="stat-card-violet rounded-xl">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Errors
                  </p>
                  <p className="font-display text-lg font-bold text-orange-500">
                    {errorCount}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="stat-card-navy rounded-xl">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50">
                  <ClipboardList className="h-4 w-4 text-navy-500" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Avg Duration
                  </p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {avgDuration != null ? `${avgDuration}ms` : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Log Table */}
      <Card className="overflow-hidden rounded-xl">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
              <ClipboardList className="h-5 w-5 text-violet-400" />
            </div>
            <p className="text-sm font-medium text-foreground">No audit logs found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="table-header-row border-border/40 hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Agent</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tool</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resource</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="border-border/30 transition-colors hover:bg-muted/20">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    {log.agentId ? (
                      <Link
                        href={`/dashboard/agents/${log.agentId}`}
                        className="text-xs font-medium text-foreground hover:text-gold-600 transition-colors"
                      >
                        {getAgentName(log.agentId)}
                      </Link>
                    ) : (
                      <span className="text-xs font-medium text-red-500">Anonymous</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    {log.action}
                  </TableCell>
                  <TableCell>
                    {log.toolName ? (
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {log.toolName}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.resourceType ? (
                      <span className="text-xs text-muted-foreground">
                        {log.resourceType}
                        {log.resourceId && (
                          <span className="ml-1 font-mono text-[10px] text-muted-foreground/70">
                            {log.resourceId.slice(0, 8)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[log.status] ?? "secondary"}>
                      {log.status}
                    </Badge>
                    {log.errorMessage && (
                      <p className="mt-0.5 text-[10px] text-red-500 truncate max-w-[120px]" title={log.errorMessage}>
                        {log.errorMessage}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {log.durationMs != null ? `${log.durationMs}ms` : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
