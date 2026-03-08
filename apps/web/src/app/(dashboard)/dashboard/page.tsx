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
import { Plus, ArrowRight, Database } from "lucide-react";

export const dynamic = "force-dynamic";

interface DatasetRow {
  id: string;
  name: string;
  license: string;
  status: "active" | "pending" | "expired";
  createdAt: string;
  blobHash: string | null;
}

interface DashboardStats {
  totalDatasets: number;
  registeredAgents: number;
  activeAgents: number;
}

const statusVariant = {
  active: "default" as const,
  pending: "secondary" as const,
  expired: "destructive" as const,
};

async function getStats(): Promise<DashboardStats> {
  try {
    const client = getForsetyClient();
    const [datasets, agents] = await Promise.all([
      client.datasets.list(),
      client.agents.list(),
    ]);
    return {
      totalDatasets: datasets.length,
      registeredAgents: agents.length,
      activeAgents: agents.filter((a) => a.isActive).length,
    };
  } catch {
    return { totalDatasets: 0, registeredAgents: 0, activeAgents: 0 };
  }
}

async function getDatasets(): Promise<DatasetRow[]> {
  try {
    const client = getForsetyClient();
    const datasetsWithLicenses = await client.datasets.listWithLicenses();

    return datasetsWithLicenses.map((d) => ({
      id: d.id,
      name: d.name,
      license: d.licenseSpdx ?? "—",
      status: "active" as const,
      createdAt: d.createdAt
        ? new Date(d.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
      blobHash: d.blobHash,
    }));
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [datasets, stats] = await Promise.all([getDatasets(), getStats()]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Datasets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Licensed datasets with verifiable evidence trails
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload Dataset
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Datasets", value: stats.totalDatasets.toString(), accent: false },
          { label: "Registered Agents", value: stats.registeredAgents.toString(), accent: false },
          { label: "Active Agents", value: stats.activeAgents.toString(), accent: false },
          { label: "Evidence Packs", value: "—", accent: true },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={`transition-all duration-200 hover:shadow-md ${
              stat.accent
                ? "border-gold-500/20 bg-gradient-to-br from-gold-500/5 to-transparent dark:border-gold-500/20 dark:from-gold-500/5"
                : "border-border"
            }`}
          >
            <CardContent className="pt-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                License
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Created
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {datasets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Database className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      No datasets yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Upload your first dataset to get started
                    </p>
                    <Button size="sm" asChild>
                      <Link href="/dashboard/upload">Upload Dataset</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              datasets.map((dataset) => (
                <TableRow key={dataset.id} className="group transition-colors">
                  <TableCell>
                    <Link href={`/dashboard/${dataset.id}`}>
                      <span className="text-sm font-medium text-foreground transition-colors group-hover:text-gold-500">
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
                    <Button variant="outline" size="sm" asChild>
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
