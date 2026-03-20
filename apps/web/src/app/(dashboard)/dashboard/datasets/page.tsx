"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  fetchDatasetsWithStatus,
  bulkDeleteDatasets,
  bulkExportDatasets,
} from "../actions";
import { statusConfig, type DatasetStatus } from "./dataset-status";
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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Alert,
  AlertDescription,
} from "@forsety/ui";
import {
  Plus,
  ArrowRight,
  Database,
  AlertTriangle,
  HardDrive,
  FileText,
  Shield,
  Search,
  Download,
  Archive,
  CheckSquare,
} from "lucide-react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSignedAction } from "@/hooks/use-signed-action";
import { GuestStatCard } from "../../components/guest-stat-card";
import { StatCardCompact } from "../../components/stat-card";
import { ErrorBanner } from "../../components/error-banner";
import { ConnectWalletCTA } from "../../components/connect-wallet-cta";
import { WalletSelector } from "@/components/wallet-selector";
import { formatDate, formatBytes } from "@/lib/format";

interface DatasetRow {
  id: string;
  name: string;
  license: string;
  status: DatasetStatus;
  createdAt: string | null;
  blobHash: string | null;
  sizeBytes: number | null;
  archivedAt: string | null;
}

export default function DatasetsPage() {
  const { isAuthenticated, guard, selectorOpen, setSelectorOpen } = useAuthGuard();
  const { executeWithSignature } = useSignedAction();
  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Archive toggle
  const [showArchived, setShowArchived] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [exportError, setExportError] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(false);
    fetchDatasetsWithStatus()
      .then((rows) => {
        setDatasets(rows as DatasetRow[]);
        setSelectedIds(new Set());
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchDatasetsWithStatus()
      .then((rows) => {
        if (cancelled) return;
        setDatasets(rows as DatasetRow[]);
        setSelectedIds(new Set());
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Unique licenses for filter dropdown
  const uniqueLicenses = useMemo(
    () => [...new Set(datasets.map((d) => d.license))].sort(),
    [datasets]
  );

  // Filtered datasets
  const filtered = useMemo(() => {
    return datasets.filter((d) => {
      if (!showArchived && d.archivedAt) return false;
      if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (licenseFilter !== "all" && d.license !== licenseFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
  }, [datasets, searchQuery, licenseFilter, statusFilter, showArchived]);

  // Stats (over all datasets, not filtered)
  const totalSize = datasets.reduce((acc, d) => acc + (d.sizeBytes ?? 0), 0);
  const licenseCounts = datasets.reduce<Record<string, number>>((acc, d) => {
    const key = d.license === "-" ? "None" : d.license;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const topLicense = Object.entries(licenseCounts).sort((a, b) => b[1] - a[1])[0];

  // Bulk handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((d) => d.id)));
    }
  };

  const handleBulkExport = async () => {
    setBulkLoading(true);
    setExportError(false);
    try {
      const result = await bulkExportDatasets(Array.from(selectedIds));
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `forsety-datasets-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setExportError(true);
      }
    } catch {
      setExportError(true);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    setBulkLoading(true);
    try {
      await executeWithSignature(
        `Archive ${selectedIds.size} dataset(s)`,
        (sig) => bulkDeleteDatasets(Array.from(selectedIds), sig)
      );
      setArchiveConfirmOpen(false);
      loadData();
    } catch {
      // User rejected wallet signature
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="page-header-accent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50">
              <Database className="h-5 w-5 text-gold-500" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Datasets
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {error
                  ? "Licensed datasets with verifiable evidence trails"
                  : `${datasets.length} dataset${datasets.length !== 1 ? "s" : ""} with verifiable evidence trails`}
              </p>
            </div>
          </div>
        </div>
        {isAuthenticated ? (
          <Button asChild className="bg-gradient-to-r from-gold-500 to-gold-600 text-white border-0 hover:from-gold-400 hover:to-gold-500">
            <Link href="/dashboard/upload">
              <Plus className="mr-2 h-4 w-4" />
              Upload Dataset
            </Link>
          </Button>
        ) : (
          <Button
            onClick={() => guard()}
            className="bg-gradient-to-r from-gold-500 to-gold-600 text-white border-0 hover:from-gold-400 hover:to-gold-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Upload Dataset
          </Button>
        )}
      </div>

      {/* Guest Stats */}
      {!isAuthenticated && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GuestStatCard label="Total Datasets" icon={FileText} cardClass="stat-card-gold" iconColor="text-gold-500" />
          <GuestStatCard label="Total Size" icon={HardDrive} cardClass="stat-card-teal" iconColor="text-teal-500" />
          <GuestStatCard label="Top License" icon={Shield} cardClass="stat-card-violet" iconColor="text-violet-500" />
        </div>
      )}

      {/* Storage Summary */}
      {isAuthenticated && !error && datasets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCardCompact label="Total Datasets" value={datasets.length} icon={FileText} cardClass="stat-card-gold" iconBgClass="bg-gold-50" iconColor="text-gold-500" />
          <StatCardCompact label="Total Size" value={totalSize > 0 ? formatBytes(totalSize) : "-"} icon={HardDrive} cardClass="stat-card-teal" iconBgClass="bg-teal-50" iconColor="text-teal-500" />
          <StatCardCompact label="Top License" value={topLicense ? topLicense[0] : "-"} icon={Shield} cardClass="stat-card-violet" iconBgClass="bg-violet-50" iconColor="text-violet-500" />
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            Unable to load datasets. Please try again later.
          </p>
        </div>
      )}

      {/* Filter Bar */}
      {datasets.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search datasets..."
              className="w-[220px] rounded-lg pl-9"
            />
          </div>
          <Select value={licenseFilter} onValueChange={setLicenseFilter}>
            <SelectTrigger className="w-[160px] rounded-lg">
              <SelectValue placeholder="All Licenses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Licenses</SelectItem>
              {uniqueLicenses.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] rounded-lg">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="warning">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="no-policy">No Policy</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-violet-500"
            />
            Show Archived
          </label>
          <div className="ml-auto flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-gold-400 to-teal-400" />
            {filtered.length} of {datasets.length}
          </div>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-3">
          <CheckSquare className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium text-violet-700">{selectedIds.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              disabled={bulkLoading}
              className="hover:border-gold-500/30 hover:text-gold-600"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveConfirmOpen(true)}
              disabled={bulkLoading}
              className="text-amber-600 hover:border-amber-500/30 hover:text-amber-700 hover:bg-amber-50"
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Archive Selected
            </Button>
          </div>
        </div>
      )}

      {/* Export Error */}
      {exportError && (
        <ErrorBanner message="Export failed. Please try again." />
      )}

      {/* Guest CTA */}
      {!isAuthenticated && (
        <ConnectWalletCTA
          title="Connect to view datasets"
          description="Connect your wallet to browse and manage your licensed datasets"
          icon={Database}
        />
      )}

      {/* Table */}
      {isAuthenticated && <Card className="overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="table-header-row border-border/40 hover:bg-transparent">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all datasets"
                  className="h-4 w-4 rounded border-border accent-violet-500"
                />
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                License
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Created
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  {error ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        Could not load datasets
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Check your connection and try refreshing
                      </p>
                    </div>
                  ) : datasets.length === 0 ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-50 to-teal-50">
                        <Database className="h-6 w-6 text-gold-400" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        No datasets yet
                      </p>
                      <p className="max-w-xs text-xs text-muted-foreground">
                        Upload your first dataset to start building verifiable evidence trails
                      </p>
                      <Button size="sm" asChild className="mt-1 bg-gradient-to-r from-gold-500 to-gold-600 text-white border-0 hover:from-gold-400 hover:to-gold-500">
                        <Link href="/dashboard/upload">
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Upload Dataset
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-50 to-teal-50">
                        <Search className="h-6 w-6 text-gold-400" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        No datasets match your filters
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search or filter criteria
                      </p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((dataset) => (
                <TableRow key={dataset.id} className="group border-border/30 transition-colors hover:bg-muted/20">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(dataset.id)}
                      onChange={() => toggleSelect(dataset.id)}
                      aria-label={`Select ${dataset.name}`}
                      className="h-4 w-4 rounded border-border accent-violet-500"
                    />
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/${dataset.id}`}>
                      <span className="text-sm font-medium text-foreground transition-colors group-hover:text-gold-600">
                        {dataset.name}
                        {dataset.archivedAt && (
                          <Badge variant="outline" className="ml-2 border-amber-300 bg-amber-50 text-amber-700 text-[10px]">
                            Archived
                          </Badge>
                        )}
                      </span>
                      {dataset.blobHash && (
                        <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                          {dataset.blobHash.slice(0, 16)}...
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {dataset.license}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusConfig[dataset.status].variant}
                      className={statusConfig[dataset.status].className}
                    >
                      {statusConfig[dataset.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dataset.createdAt ? formatDate(dataset.createdAt) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild className="hover:border-gold-500/30 hover:text-gold-600">
                      <Link href={`/dashboard/${dataset.id}`}>
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
      </Card>}

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Confirm Archive</DialogTitle>
          </DialogHeader>
          <Alert className="rounded-lg border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              Are you sure you want to archive {selectedIds.size} dataset{selectedIds.size !== 1 ? "s" : ""}?
              Archived datasets can be restored later.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={handleBulkArchive}
              disabled={bulkLoading}
            >
              {bulkLoading ? "Archiving..." : "Archive"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WalletSelector open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
}
