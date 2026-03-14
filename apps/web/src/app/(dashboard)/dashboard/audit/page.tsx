"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchAgents, fetchAllAuditLogs, countAuditLogs, fetchDatasetsList } from "../actions";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
  Input,
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
import {
  Download,
  ClipboardList,
  CheckCircle2,
  ShieldAlert,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { GuestStatCard } from "../../components/guest-stat-card";
import { ConnectWalletCTA } from "../../components/connect-wallet-cta";
import { WalletSelector } from "@/components/wallet-selector";

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

interface DatasetInfo {
  id: string;
  name: string;
}

const PAGE_SIZE = 50;

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
  const { isAuthenticated, guard, selectorOpen, setSelectorOpen } = useAuthGuard();
  const searchParams = useSearchParams();
  const filterAgentId = searchParams.get("agentId");

  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>(filterAgentId ?? "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [datasetFilter, setDatasetFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    Promise.all([fetchAgents(), fetchDatasetsList()]).then(([a, d]) => {
      setAgents(a.map((ag: { id: string; name: string }) => ({ id: ag.id, name: ag.name })));
      setDatasets(d);
    });
  }, []);

  const buildFilters = useCallback(() => {
    const filters: {
      agentId?: string | null;
      status?: string;
      resourceId?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    } = {
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    };

    if (selectedAgent === "anonymous") {
      filters.agentId = null;
    } else if (selectedAgent !== "all") {
      filters.agentId = selectedAgent;
    }

    if (statusFilter !== "all") filters.status = statusFilter;
    if (datasetFilter !== "all") filters.resourceId = datasetFilter;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    return filters;
  }, [selectedAgent, statusFilter, datasetFilter, dateFrom, dateTo, currentPage]);

  useEffect(() => {
    setLoading(true);
    const filters = buildFilters();

    const countFilters = { ...filters };
    delete countFilters.limit;
    delete countFilters.offset;

    Promise.all([
      fetchAllAuditLogs(filters),
      countAuditLogs(countFilters),
    ])
      .then(([l, c]) => {
        setLogs(l as AuditLog[]);
        setTotalCount(c);
      })
      .finally(() => setLoading(false));
  }, [buildFilters]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAgent, statusFilter, datasetFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const getAgentName = (agentId: string | null) =>
    agentId ? (agents.find((a) => a.id === agentId)?.name ?? agentId.slice(0, 8)) : "Anonymous";

  const handleExportJson = () => {
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

  const handleExportCsv = () => {
    const headers = ["Time", "Agent", "Action", "Tool", "Resource Type", "Resource ID", "Status", "Error", "Duration (ms)"];
    const rows = logs.map((l) => [
      l.timestamp,
      getAgentName(l.agentId),
      l.action,
      l.toolName ?? "",
      l.resourceType ?? "",
      l.resourceId ?? "",
      l.status,
      l.errorMessage ?? "",
      l.durationMs?.toString() ?? "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => { if (!guard()) return; handleExportCsv(); }}
            disabled={logs.length === 0}
            className="hover:border-gold-500/30 hover:text-gold-600"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => { if (!guard()) return; handleExportJson(); }}
            disabled={logs.length === 0}
            className="hover:border-gold-500/30 hover:text-gold-600"
          >
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
        </div>
      </div>

      {/* Guest Stats */}
      {!isAuthenticated && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <GuestStatCard label="Success" icon={CheckCircle2} cardClass="stat-card-teal" iconColor="text-emerald-500" />
          <GuestStatCard label="Denied" icon={ShieldAlert} cardClass="stat-card-gold" iconColor="text-red-500" />
          <GuestStatCard label="Errors" icon={AlertCircle} cardClass="stat-card-violet" iconColor="text-orange-500" />
          <GuestStatCard label="Avg Duration" icon={ClipboardList} cardClass="stat-card-navy" iconColor="text-navy-500" />
        </div>
      )}

      {/* Guest CTA */}
      {!isAuthenticated && (
        <ConnectWalletCTA
          title="Connect to view audit trail"
          description="Connect your wallet to see the complete audit log of agent activities"
          icon={ClipboardList}
        />
      )}

      {/* Filters */}
      {isAuthenticated && <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="w-[180px] rounded-lg">
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
          <SelectTrigger className="w-[140px] rounded-lg">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <Select value={datasetFilter} onValueChange={setDatasetFilter}>
          <SelectTrigger className="w-[180px] rounded-lg">
            <SelectValue placeholder="All Datasets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Datasets</SelectItem>
            {datasets.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
          className="w-[150px] rounded-lg"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
          className="w-[150px] rounded-lg"
        />

        <div className="ml-auto flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-gold-400 to-teal-400" />
          {totalCount} total
        </div>
      </div>}

      {isAuthenticated && <>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="hover:border-gold-500/30"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="hover:border-gold-500/30"
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
      </>}

      <WalletSelector open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
}
