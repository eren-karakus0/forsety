import Link from "next/link";
import { getForsetyClient } from "@/lib/forsety";
import {
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
import { Layers, FileText, Database, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

interface EvidenceRow {
  id: string;
  datasetId: string;
  datasetName: string;
  packHash: string;
  generatedAt: string;
}

async function getEvidencePacks(): Promise<{ rows: EvidenceRow[]; error: boolean }> {
  try {
    const client = getForsetyClient();
    const packs = await client.evidence.listAll({ limit: 100 });

    return {
      rows: packs.map((p) => ({
        id: p.id,
        datasetId: p.datasetId,
        datasetName: p.datasetName,
        packHash: p.packHash,
        generatedAt: p.generatedAt.toISOString(),
      })),
      error: false,
    };
  } catch {
    return { rows: [], error: true };
  }
}

export default async function EvidencePage() {
  const { rows: packs, error } = await getEvidencePacks();

  const uniqueDatasets = new Set(packs.map((p) => p.datasetId)).size;
  const latestGeneration = packs.length > 0
    ? new Date(packs[0].generatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

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
              {error
                ? "Cryptographic evidence trails for your datasets"
                : `${packs.length} evidence pack${packs.length !== 1 ? "s" : ""} generated`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {!error && packs.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="stat-card-gold rounded-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-50">
                <FileText className="h-4 w-4 text-gold-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Packs
                </p>
                <p className="font-display text-lg font-bold text-foreground">
                  {packs.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card-teal rounded-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
                <Calendar className="h-4 w-4 text-teal-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Latest Generation
                </p>
                <p className="font-display text-lg font-bold text-foreground">
                  {latestGeneration}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card-violet rounded-xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Database className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Unique Datasets
                </p>
                <p className="font-display text-lg font-bold text-foreground">
                  {uniqueDatasets}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="table-header-row border-border/40 hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Dataset
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hash
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Generated
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
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
                    <p className="text-sm font-medium text-foreground">
                      No evidence packs generated yet
                    </p>
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
                    {new Date(pack.generatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/evidence/${pack.id}`}
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
      </Card>
    </div>
  );
}
