"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchAgents, fetchAllAuditLogs } from "../actions";
import {
  Button,
  Card,
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
import { Download } from "lucide-react";

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
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Audit Trail
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete audit log of all agent activities
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={logs.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="w-[200px]">
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
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto self-center text-sm text-muted-foreground">
          {logs.length} entries
        </div>
      </div>

      {/* Log Table */}
      <Card>
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            No audit logs found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tool</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resource</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="transition-colors">
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
                        className="text-xs font-medium text-foreground hover:text-gold-500 transition-colors"
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
                      <span className="text-xs text-muted-foreground">—</span>
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
                      <span className="text-xs text-muted-foreground">—</span>
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
                    {log.durationMs != null ? `${log.durationMs}ms` : "—"}
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
