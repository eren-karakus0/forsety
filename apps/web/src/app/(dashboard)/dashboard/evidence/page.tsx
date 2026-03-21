"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAllEvidencePacks } from "../actions";
import {
  Card,
  Badge,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@forsety/ui";
import { Layers, FileText, Database, Calendar } from "lucide-react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { GuestStatCard } from "../../components/guest-stat-card";
import { StatCardCompact } from "../../components/stat-card";
import { ConnectWalletCTA } from "../../components/connect-wallet-cta";
import { formatDate } from "@/lib/format";

interface EvidenceRow {
  id: string;
  datasetId: string;
  datasetName: string;
  packHash: string;
  generatedAt: string;
}

export default function EvidencePage() {
  const { isAuthenticated } = useAuthGuard();
  const [packs, setPacks] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchAllEvidencePacks({ limit: 100 })
      .then((rows) => {
        if (!cancelled) setPacks(rows as EvidenceRow[]);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const uniqueDatasets = new Set(packs.map((p) => p.datasetId)).size;
  const latestGeneration =
    packs.length > 0 ? formatDate(packs[0].generatedAt) : "-";

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
      <div className="page-header-accent">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50">
            <Layers className="h-5 w-5 text-gold-500" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Evidence Packs
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {!isAuthenticated
                ? "Cryptographic evidence trails for your datasets"
                : error
                  ? "Cryptographic evidence trails for your datasets"
                  : `${packs.length} evidence pack${packs.length !== 1 ? "s" : ""} generated`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {!isAuthenticated ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GuestStatCard label="Total Packs" icon={FileText} cardClass="stat-card-gold" iconColor="text-gold-500" />
          <GuestStatCard label="Latest Generation" icon={Calendar} cardClass="stat-card-teal" iconColor="text-teal-500" />
          <GuestStatCard label="Unique Datasets" icon={Database} cardClass="stat-card-violet" iconColor="text-violet-500" />
        </div>
      ) : packs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCardCompact label="Total Packs" value={packs.length} icon={FileText} cardClass="stat-card-gold" iconBgClass="bg-gold-50" iconColor="text-gold-500" />
          <StatCardCompact label="Latest Generation" value={latestGeneration} icon={Calendar} cardClass="stat-card-teal" iconBgClass="bg-teal-50" iconColor="text-teal-500" />
          <StatCardCompact label="Unique Datasets" value={uniqueDatasets} icon={Database} cardClass="stat-card-violet" iconBgClass="bg-violet-50" iconColor="text-violet-500" />
        </div>
      )}

      {/* Table or CTA */}
      {!isAuthenticated ? (
        <ConnectWalletCTA
          title="Connect to view evidence packs"
          description="Connect your wallet to see cryptographic evidence trails for your datasets"
          icon={Layers}
        />
      ) : (
        <Card className="overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="table-header-row border-border/40 hover:bg-transparent">
                <TableHead className="th-label">Dataset</TableHead>
                <TableHead className="th-label">Hash</TableHead>
                <TableHead className="th-label">Generated</TableHead>
                <TableHead className="th-label text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-50 to-teal-50">
                        <Layers className="h-6 w-6 text-gold-400" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No evidence packs generated yet</p>
                      <p className="max-w-xs text-xs text-muted-foreground">
                        Generate your first evidence pack from a dataset detail page
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                packs.map((pack) => (
                  <TableRow key={pack.id} className="group border-border/30 transition-colors hover:bg-muted/20">
                    <TableCell>
                      <Link href={`/dashboard/${pack.datasetId}`}>
                        <span className="text-sm font-medium text-foreground transition-colors group-hover:text-gold-600">
                          {pack.datasetName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {pack.packHash.slice(0, 16)}...
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(pack.generatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/evidence/${pack.id}`}
                        data-umami-event="view-evidence"
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-gold-500/30 hover:text-gold-600"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}

    </div>
  );
}
