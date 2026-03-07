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
import { Download, Layers, Check, ChevronRight, Eye, Loader2 } from "lucide-react";

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
    <div className="flex items-start justify-between border-b border-navy-100/80 py-3 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-navy-400">
        {label}
      </span>
      <span
        className={`max-w-[60%] text-right text-sm ${
          mono ? "font-mono text-xs break-all text-navy-600" : "text-navy-800"
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
        <p className="text-sm text-navy-600">Dataset not found</p>
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
      <div className="mb-6 flex items-center gap-2 text-sm text-navy-400">
        <Link href="/dashboard" className="transition-colors hover:text-navy-600">
          Datasets
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-navy-700">{dataset.name}</span>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="access">
            Access Log ({accessLogs.length})
          </TabsTrigger>
          <TabsTrigger value="policies">
            Policies ({policies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access">
          <Card className="border-navy-200/60">
            <CardHeader className="border-b border-navy-100 bg-navy-50/50">
              <CardTitle className="text-sm">Access Log Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {accessLogs.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-navy-400">
                  No access logs yet
                </div>
              ) : (
                <div className="divide-y divide-navy-100/80">
                  {accessLogs.map((log: AccessLogEntry) => (
                    <div key={log.id} className="flex items-start gap-4 px-5 py-4">
                      <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-navy-100">
                        <Eye className="h-3.5 w-3.5 text-navy-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                            {log.operationType}
                          </Badge>
                          <span className="text-xs text-navy-400">
                            {new Date(log.timestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-navy-500 truncate">
                          Accessor: {log.accessorAddress}
                        </p>
                        {log.readProof && (
                          <p className="mt-0.5 font-mono text-[10px] text-navy-400 truncate">
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
          <Card className="border-navy-200/60">
            <CardHeader className="border-b border-navy-100 bg-navy-50/50">
              <CardTitle className="text-sm">Policy Versions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {policies.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-navy-400">
                  No policies defined
                </div>
              ) : (
                <div className="divide-y divide-navy-100/80">
                  {policies.map((pol: PolicyEntry) => (
                    <div key={pol.id} className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-navy-800 text-[10px]">
                            v{pol.version}
                          </Badge>
                          <span className="text-xs text-navy-500">
                            {pol.createdAt ? new Date(pol.createdAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-navy-500">
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
                        <p className="mt-1 font-mono text-[10px] text-navy-400">
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
              <Card className="border-navy-200/60">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h1 className="font-display text-xl font-bold text-navy-800">
                      {dataset.name}
                    </h1>
                    <Badge variant="default">Active</Badge>
                  </div>

                  {dataset.description && (
                    <p className="mb-4 text-sm text-navy-600">{dataset.description}</p>
                  )}

                  <div className="rounded-lg bg-navy-50/50 p-4">
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
              <Card className="border-navy-200/60">
                <CardContent className="pt-6">
                  <h2 className="mb-4 font-display text-base font-semibold text-navy-800">
                    Licenses
                  </h2>
                  {licenses.length === 0 ? (
                    <p className="text-sm text-navy-400">No licenses attached</p>
                  ) : (
                    <div className="space-y-3">
                      {licenses.map((lic) => (
                        <div
                          key={lic.id}
                          className="flex items-center justify-between rounded-lg border border-navy-100 bg-navy-50/30 px-4 py-3"
                        >
                          <div>
                            <Badge variant="secondary" className="bg-gold-100 text-gold-800 font-mono">
                              {lic.spdxType}
                            </Badge>
                            <p className="mt-1 font-mono text-[11px] text-navy-400">
                              Grantor: {lic.grantorAddress.slice(0, 10)}...
                            </p>
                          </div>
                          {lic.termsHash && (
                            <span className="font-mono text-[10px] text-navy-400">
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
              <Card className="border-gold-300/60 bg-gradient-to-b from-gold-50/60 to-white">
                <CardContent className="pt-6">
                  <h2 className="mb-1 font-display text-base font-semibold text-navy-800">
                    Evidence Pack
                  </h2>
                  <p className="mb-5 text-xs text-navy-500">
                    Generate a cryptographic evidence pack for this dataset
                  </p>

                  {!evidence ? (
                    <Button
                      onClick={handleGenerateEvidence}
                      disabled={generating}
                      className="w-full"
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
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
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
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download JSON
                      </Button>
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Evidence JSON Preview */}
              {evidence && (
                <Card className="border-navy-200/60 overflow-hidden">
                  <CardHeader className="border-b border-navy-100 bg-navy-50/50 py-2.5">
                    <CardTitle className="text-xs uppercase tracking-wider">
                      JSON Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <pre className="max-h-80 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-navy-600">
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
