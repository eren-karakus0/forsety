"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchAllPolicies, fetchDatasetsList, fetchViolationCount } from "../actions";
import { CreatePolicyDialog } from "./create-policy-dialog";
import { EditPolicyDialog } from "./edit-policy-dialog";
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
import { Shield, Plus, Clock, ShieldAlert, Pencil, ShieldX } from "lucide-react";

interface PolicyRow {
  id: string;
  datasetId: string;
  datasetName: string;
  version: number;
  allowedAccessors: string[];
  maxReads: number | null;
  readsConsumed: number;
  expiresAt: string | null;
  createdAt: string;
  hash: string | null;
}

interface DatasetOption {
  id: string;
  name: string;
}

function computeStatus(expiresAt: string | null): "active" | "expiring" | "expired" {
  if (!expiresAt) return "active";
  const exp = new Date(expiresAt);
  const now = new Date();
  if (exp < now) return "expired";
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (exp.getTime() - now.getTime() < sevenDays) return "expiring";
  return "active";
}

const statusConfig = {
  active: { label: "Active", variant: "default" as const, className: "" },
  expiring: { label: "Expiring Soon", variant: "secondary" as const, className: "text-orange-600" },
  expired: { label: "Expired", variant: "destructive" as const, className: "" },
};

export default function PoliciesPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [datasetFilter, setDatasetFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<PolicyRow | null>(null);
  const [violationCount, setViolationCount] = useState(0);

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchAllPolicies(), fetchDatasetsList(), fetchViolationCount()])
      .then(([pols, ds, violations]) => {
        setPolicies(pols as PolicyRow[]);
        setDatasets(ds);
        setViolationCount(violations);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = datasetFilter === "all"
    ? policies
    : policies.filter((p) => p.datasetId === datasetFilter);

  const expiringSoon = policies.filter((p) => computeStatus(p.expiresAt) === "expiring").length;
  const expired = policies.filter((p) => computeStatus(p.expiresAt) === "expired").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-20 rounded-xl" />
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <Shield className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Policies
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {policies.length} polic{policies.length !== 1 ? "ies" : "y"} across all datasets
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-to-r from-violet-500 to-violet-600 text-white border-0 hover:from-violet-400 hover:to-violet-500"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Policy
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="stat-card-violet rounded-xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
              <Shield className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Policies
              </p>
              <p className="font-display text-lg font-bold text-foreground">{policies.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gold rounded-xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Expiring Soon
              </p>
              <p className="font-display text-lg font-bold text-orange-500">{expiringSoon}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-navy rounded-xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Expired
              </p>
              <p className="font-display text-lg font-bold text-red-500">{expired}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="stat-card-navy cursor-pointer rounded-xl transition-colors hover:bg-muted/30"
          onClick={() => router.push("/dashboard/audit?status=denied")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <ShieldX className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Violations
              </p>
              <p className="font-display text-lg font-bold text-red-500">{violationCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dataset Filter */}
      <div className="flex items-center gap-3">
        <Select value={datasetFilter} onValueChange={setDatasetFilter}>
          <SelectTrigger className="w-[220px] rounded-lg">
            <SelectValue placeholder="All Datasets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Datasets</SelectItem>
            {datasets.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-teal-400" />
          {filtered.length} entries
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden rounded-xl">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-teal-50">
              <Shield className="h-6 w-6 text-violet-400" />
            </div>
            <p className="text-sm font-medium text-foreground">No policies found</p>
            <p className="text-xs text-muted-foreground">
              Create a policy to control dataset access
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="table-header-row border-border/40 hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dataset</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Version</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Accessors</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reads</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Expires</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pol) => {
                const status = computeStatus(pol.expiresAt);
                const cfg = statusConfig[status];
                return (
                  <TableRow key={pol.id} className="group border-border/30 transition-colors hover:bg-muted/20">
                    <TableCell>
                      <Link href={`/dashboard/${pol.datasetId}`} className="text-sm font-medium text-foreground transition-colors hover:text-gold-600">
                        {pol.datasetName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[10px]">v{pol.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {pol.allowedAccessors.slice(0, 2).map((addr, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-[10px]">
                            {addr === "*" ? "* (all)" : `${addr.slice(0, 8)}...`}
                          </Badge>
                        ))}
                        {pol.allowedAccessors.length > 2 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{pol.allowedAccessors.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {pol.readsConsumed}/{pol.maxReads ?? "\u221e"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {pol.expiresAt
                        ? new Date(pol.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(pol.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditPolicy(pol)}
                        className="h-8 w-8 p-0 hover:text-violet-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <CreatePolicyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        datasets={datasets}
        onCreated={loadData}
      />

      {editPolicy && (
        <EditPolicyDialog
          open={!!editPolicy}
          onOpenChange={(open) => { if (!open) setEditPolicy(null); }}
          policy={editPolicy}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}
