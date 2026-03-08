import Link from "next/link";
import { getForsetyClient } from "@/lib/forsety";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@forsety/ui";
import { Plus, ArrowRight, Database, AlertTriangle, HardDrive, FileText, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

interface DatasetRow {
  id: string;
  name: string;
  license: string;
  status: "active" | "pending" | "expired";
  createdAt: string;
  blobHash: string | null;
  sizeBytes: number | null;
}

const statusVariant = {
  active: "default" as const,
  pending: "secondary" as const,
  expired: "destructive" as const,
};

async function getDatasets(): Promise<{ rows: DatasetRow[]; error: boolean }> {
  try {
    const client = getForsetyClient();
    const datasetsWithLicenses = await client.datasets.listWithLicenses();

    return {
      rows: datasetsWithLicenses.map((d) => ({
        id: d.id,
        name: d.name,
        license: d.licenseSpdx ?? "-",
        status: "active" as const,
        createdAt: d.createdAt
          ? new Date(d.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "-",
        blobHash: d.blobHash,
        sizeBytes: d.sizeBytes,
      })),
      error: false,
    };
  } catch {
    return { rows: [], error: true };
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DatasetsPage() {
  const { rows: datasets, error } = await getDatasets();

  const totalSize = datasets.reduce((acc, d) => acc + (d.sizeBytes ?? 0), 0);
  const licenseCounts = datasets.reduce<Record<string, number>>((acc, d) => {
    const key = d.license === "-" ? "None" : d.license;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const topLicense = Object.entries(licenseCounts).sort((a, b) => b[1] - a[1])[0];

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
        <Button asChild className="bg-gradient-to-r from-gold-500 to-gold-600 text-white border-0 hover:from-gold-400 hover:to-gold-500">
          <Link href="/dashboard/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload Dataset
          </Link>
        </Button>
      </div>

      {/* Storage Summary */}
      {!error && datasets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="stat-card-gold rounded-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-50">
                <FileText className="h-4 w-4 text-gold-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Datasets
                </p>
                <p className="font-display text-lg font-bold text-foreground">
                  {datasets.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card-teal rounded-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
                <HardDrive className="h-4 w-4 text-teal-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Size
                </p>
                <p className="font-display text-lg font-bold text-foreground">
                  {totalSize > 0 ? formatBytes(totalSize) : "-"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card-violet rounded-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Shield className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Top License
                </p>
                <p className="font-display text-lg font-bold text-foreground">
                  {topLicense ? topLicense[0] : "-"}
                </p>
              </div>
            </CardContent>
          </Card>
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

      {/* Table */}
      <Card className="overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="table-header-row border-border/40 hover:bg-transparent">
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
            {datasets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
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
                  ) : (
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
                  )}
                </TableCell>
              </TableRow>
            ) : (
              datasets.map((dataset) => (
                <TableRow key={dataset.id} className="group border-border/30 transition-colors hover:bg-muted/20">
                  <TableCell>
                    <Link href={`/dashboard/${dataset.id}`}>
                      <span className="text-sm font-medium text-foreground transition-colors group-hover:text-gold-600">
                        {dataset.name}
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
                    <Badge variant={statusVariant[dataset.status]}>
                      {dataset.status.charAt(0).toUpperCase() +
                        dataset.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dataset.createdAt}
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
      </Card>
    </div>
  );
}
