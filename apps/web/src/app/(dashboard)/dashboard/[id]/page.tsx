"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchDatasetDetail, generateEvidencePack, fetchAccessLogs, fetchPolicies } from "../actions";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
} from "@forsety/ui";
import { Download, Layers, Check, ChevronRight, Eye, Loader2, Database } from "lucide-react";

interface DatasetDetail {
  dataset: {
    id: string;
    name: string;
    description: string | null;
    shelbyBlobId: string | null;
    shelbyBlobName: string | null;
    blobHash: string | null;
    sizeBytes: number | null;
    ownerAddress: string;
    createdAt: string;
  };
  licenses: Array<{
    id: string;
    spdxType: string;
    grantorAddress: string;
    termsHash: string | null;
  }>;
}

interface EvidencePack {
  json: Record<string, unknown>;
  hash: string;
}

interface AccessLogEntry {
  id: string;
  accessorAddress: string;
  operationType: string;
  blobHashAtRead: string | null;
  readProof: string | null;
  policyVersion: number | null;
  policyHash: string | null;
  licenseHash: string | null;
  timestamp: string;
}

interface PolicyEntry {
  id: string;
  version: number;
  hash: string | null;
  allowedAccessors: string[];
  maxReads: number | null;
  readsConsumed: number;
  expiresAt: Date | string | null;
  createdAt: Date | string;
}

function MetadataRow({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between border-b border-border/30 py-3 last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={`max-w-[60%] text-right text-sm ${
          mono ? "font-mono text-xs break-all text-muted-foreground" : "text-foreground"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

export default function DatasetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<DatasetDetail | null>(null);
  const [evidence, setEvidence] = useState<EvidencePack | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [policies, setPolicies] = useState<PolicyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchDatasetDetail(id),
      fetchAccessLogs(id),
      fetchPolicies(id),
    ])
      .then(([d, logs, pols]) => {
        setData(d);
        setAccessLogs(logs);
        setPolicies(pols);
      })
      .catch(() => setError("Failed to load dataset"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleGenerateEvidence = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateEvidencePack(id);
      if (!result.success) throw new Error(result.error ?? "Generation failed");
      setEvidence({ json: result.json!, hash: result.hash! });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const downloadEvidence = () => {
    if (!evidence) return;
    const blob = new Blob([JSON.stringify(evidence.json, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-pack-${id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-50">
          <Database className="h-5 w-5 text-gold-400" />
        </div>
        <p className="text-sm font-medium text-foreground">Dataset not found</p>
        <Button variant="link" asChild>
          <Link href="/dashboard">Back to datasets</Link>
        </Button>
      </div>
    );
  }

  const { dataset, licenses } = data;

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/datasets" className="transition-colors hover:text-gold-600">
          Datasets
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{dataset.name}</span>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 rounded-lg">
          <TabsTrigger value="overview" className="rounded-md">Overview</TabsTrigger>
          <TabsTrigger value="access" className="rounded-md">
            Access Log ({accessLogs.length})
          </TabsTrigger>
          <TabsTrigger value="policies" className="rounded-md">
            Policies ({policies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access">
          <Card className="overflow-hidden rounded-xl">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent">
              <CardTitle className="text-sm font-semibold">Access Log Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {accessLogs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-5 py-12">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No access logs yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {accessLogs.map((log: AccessLogEntry) => (
                    <div key={log.id} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/20">
                      <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted/60">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                            {log.operationType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-muted-foreground truncate">
                          Accessor: {log.accessorAddress}
                        </p>
                        {log.readProof && (
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70 truncate">
                            Proof: {log.readProof.slice(0, 32)}...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card className="overflow-hidden rounded-xl">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent">
              <CardTitle className="text-sm font-semibold">Policy Versions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {policies.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-5 py-12">
                  <p className="text-sm text-muted-foreground">No policies defined</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {policies.map((pol: PolicyEntry) => (
                    <div key={pol.id} className="px-5 py-4 transition-colors hover:bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px]">
                            v{pol.version}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {pol.createdAt ? new Date(pol.createdAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{pol.readsConsumed ?? 0}/{pol.maxReads ?? "∞"} reads</span>
                          {pol.expiresAt && (
                            <span className={new Date(pol.expiresAt) < new Date() ? "text-red-500" : ""}>
                              Expires: {new Date(pol.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(pol.allowedAccessors ?? []).map((addr: string, i: number) => (
                          <Badge key={i} variant="secondary" className="font-mono text-[10px]">
                            {addr === "*" ? "* (all)" : `${addr.slice(0, 10)}...`}
                          </Badge>
                        ))}
                      </div>
                      {pol.hash && (
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                          Hash: {pol.hash.slice(0, 24)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Metadata */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="overflow-hidden rounded-xl">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50">
                        <Database className="h-5 w-5 text-gold-500" />
                      </div>
                      <h1 className="font-display text-xl font-bold text-foreground">
                        {dataset.name}
                      </h1>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>

                  {dataset.description && (
                    <p className="mb-4 text-sm text-muted-foreground">{dataset.description}</p>
                  )}

                  <div className="rounded-xl bg-muted/30 p-4">
                    <MetadataRow label="Dataset ID" value={dataset.id} mono />
                    <MetadataRow label="Shelby Blob" value={dataset.shelbyBlobName} mono />
                    <MetadataRow label="Blob Hash" value={dataset.blobHash} mono />
                    <MetadataRow label="Size" value={dataset.sizeBytes ? `${dataset.sizeBytes} bytes` : null} />
                    <MetadataRow label="Owner" value={dataset.ownerAddress} mono />
                    <MetadataRow
                      label="Created"
                      value={new Date(dataset.createdAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Licenses */}
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <h2 className="mb-4 font-display text-base font-semibold text-foreground">
                    Licenses
                  </h2>
                  {licenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No licenses attached</p>
                  ) : (
                    <div className="space-y-3">
                      {licenses.map((lic) => (
                        <div
                          key={lic.id}
                          className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/30"
                        >
                          <div>
                            <Badge variant="secondary" className="font-mono">
                              {lic.spdxType}
                            </Badge>
                            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                              Grantor: {lic.grantorAddress.slice(0, 10)}...
                            </p>
                          </div>
                          {lic.termsHash && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {lic.termsHash.slice(0, 12)}...
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Evidence Pack */}
            <div className="space-y-6">
              <Card className="stat-card-gold rounded-xl">
                <CardContent className="pt-6">
                  <h2 className="mb-1 font-display text-base font-semibold text-foreground">
                    Evidence Pack
                  </h2>
                  <p className="mb-5 text-xs text-muted-foreground">
                    Generate a cryptographic evidence pack for this dataset
                  </p>

                  {!evidence ? (
                    <Button
                      onClick={handleGenerateEvidence}
                      disabled={generating}
                      className="w-full bg-gradient-to-r from-gold-500 to-teal-500 text-white border-0 hover:from-gold-400 hover:to-teal-400"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Layers className="mr-2 h-4 w-4" />
                          Generate Evidence Pack
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-700">
                            Pack Generated
                          </span>
                        </div>
                        <p className="mt-1.5 font-mono text-[10px] text-emerald-600 break-all">
                          Hash: {evidence.hash}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        onClick={downloadEvidence}
                        className="w-full hover:border-gold-500/30 hover:text-gold-600"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download JSON
                      </Button>
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive" className="mt-3 rounded-xl">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Evidence JSON Preview */}
              {evidence && (
                <Card className="overflow-hidden rounded-xl">
                  <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent py-2.5">
                    <CardTitle className="text-[11px] uppercase tracking-wider">
                      JSON Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <pre className="max-h-80 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {JSON.stringify(evidence.json, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
