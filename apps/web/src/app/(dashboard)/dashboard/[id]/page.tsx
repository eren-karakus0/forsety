"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Download, Layers, Check, ChevronRight, Eye, Loader2, Database, Plus, Pencil, Share2, Info, Users } from "lucide-react";
import { computeDatasetStatus, statusConfig } from "../datasets/dataset-status";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSignedAction } from "@/hooks/use-signed-action";
import { triggerDownload } from "@/lib/download";
import { formatDateTime } from "@/lib/format";
import { ConnectWalletCTA } from "../../components/connect-wallet-cta";
import { SetupChecklist } from "./setup-checklist";
import { ShareDatasetDialog } from "./share-dataset-dialog";
import { FilePreview } from "./file-preview";
import { AnalyticsPanel } from "./analytics-panel";
import { CreatePolicyDialog } from "../policies/create-policy-dialog";
import { EditPolicyDialog } from "../policies/edit-policy-dialog";

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
  id?: string;
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
        {value || "-"}
      </span>
    </div>
  );
}

export default function DatasetDetailPage() {
  const { isAuthenticated } = useAuthGuard();
  const { executeWithSignature } = useSignedAction();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<DatasetDetail | null>(null);
  const [evidence, setEvidence] = useState<EvidencePack | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [policies, setPolicies] = useState<PolicyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // WS-1.3 + WS-2: Dialog states
  const [createPolicyOpen, setCreatePolicyOpen] = useState(false);
  const [editPolicyOpen, setEditPolicyOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyEntry | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchDatasetDetail(id),
      fetchAccessLogs(id),
      fetchPolicies(id),
    ])
      .then(([d, logs, pols]) => {
        if (cancelled) return;
        setData(d);
        setAccessLogs(logs);
        setPolicies(pols);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load dataset");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, isAuthenticated]);

  // WS-2.2: Access summary computed from existing state
  const accessSummary = useMemo(() => {
    const uniqueAccessors = new Set(accessLogs.map((l) => l.accessorAddress));
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentLogs = accessLogs.filter((l) => new Date(l.timestamp) >= sevenDaysAgo);
    const latestPolicy = policies[policies.length - 1];
    return {
      totalAccess: accessLogs.length,
      uniqueAccessors: uniqueAccessors.size,
      accessorList: Array.from(uniqueAccessors),
      last7Days: recentLogs.length,
      latestPolicy,
    };
  }, [accessLogs, policies]);

  const handleDownloadDataset = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const check = await fetch(`/api/datasets/${id}/download`, {
        method: "HEAD",
        credentials: "include",
      });
      if (!check.ok) {
        const messages: Record<number, string> = {
          400: "Accessor address required",
          401: "Unauthorized",
          403: "Access denied",
          404: "Dataset not found or not available for download",
        };
        setDownloadError(messages[check.status] ?? "Download failed");
        return;
      }
      const a = document.createElement("a");
      a.href = `/api/datasets/${id}/download`;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => {
        fetchAccessLogs(id).then(setAccessLogs).catch(() => {});
      }, 2000);
    } catch {
      setDownloadError("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleGenerateEvidence = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await executeWithSignature(
        `Generate evidence pack for dataset ${id.slice(0, 8)}`,
        (sig) => generateEvidencePack(id, sig)
      );
      if (!result.success) throw new Error(result.error ?? "Generation failed");
      setEvidence({ id: result.id, json: result.json!, hash: result.hash! });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const downloadEvidence = () => {
    if (!evidence) return;
    triggerDownload(
      JSON.stringify(evidence.json, null, 2),
      `evidence-pack-${id.slice(0, 8)}.json`,
      "application/json"
    );
  };

  const refreshPolicies = () => {
    fetchPolicies(id).then(setPolicies).catch(() => {});
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

  if (!isAuthenticated) {
    return (
      <ConnectWalletCTA
        title="Connect to view dataset details"
        description="Connect your wallet to access dataset information, evidence packs, and access logs"
        icon={Database}
        variant="full-page"
      />
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

      {/* WS-1.2: Setup Checklist Banner */}
      <SetupChecklist
        datasetId={id}
        hasPolicy={policies.length > 0}
        hasEvidence={!!evidence}
        onCreatePolicy={() => setCreatePolicyOpen(true)}
        onGenerateEvidence={handleGenerateEvidence}
      />

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 rounded-lg">
          <TabsTrigger value="overview" className="rounded-md">Overview</TabsTrigger>
          <TabsTrigger value="access" className="rounded-md">
            Access ({accessLogs.length})
          </TabsTrigger>
          <TabsTrigger value="policies" className="rounded-md">
            Policies ({policies.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-md">
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ===== ACCESS TAB ===== */}
        <TabsContent value="access">
          <div className="space-y-6">
            {/* WS-2.2: Access Summary Panel */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="rounded-xl">
                <CardContent className="pt-5 pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Access</p>
                  <p className="mt-1 font-display text-2xl font-bold text-foreground">{accessSummary.totalAccess}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-5 pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Unique Accessors</p>
                  <p className="mt-1 font-display text-2xl font-bold text-foreground">{accessSummary.uniqueAccessors}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-5 pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last 7 Days</p>
                  <p className="mt-1 font-display text-2xl font-bold text-foreground">{accessSummary.last7Days}</p>
                </CardContent>
              </Card>
            </div>

            {/* Unique Accessors List */}
            {accessSummary.accessorList.length > 0 && (
              <Card className="rounded-xl">
                <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent py-3">
                  <CardTitle className="text-xs font-semibold flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Unique Accessors
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/30">
                    {accessSummary.accessorList.slice(0, 10).map((addr) => (
                      <div key={addr} className="flex items-center gap-2 px-5 py-2.5">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {addr.slice(0, 16)}...{addr.slice(-6)}
                        </Badge>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {accessLogs.filter((l) => l.accessorAddress === addr).length} access(es)
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Access Log Timeline */}
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
                              {log.timestamp ? formatDateTime(log.timestamp) : "-"}
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
          </div>
        </TabsContent>

        {/* ===== POLICIES TAB with CTA buttons (WS-2.1) ===== */}
        <TabsContent value="policies">
          <Card className="overflow-hidden rounded-xl">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Policy Versions</CardTitle>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setCreatePolicyOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Policy
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {policies.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-5 py-12">
                  <p className="text-sm text-muted-foreground">No policies defined</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreatePolicyOpen(true)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create your first policy
                  </Button>
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
                            {pol.createdAt ? new Date(pol.createdAt).toLocaleDateString() : "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {pol.readsConsumed ?? 0}/{pol.maxReads ?? "\u221E"} reads
                          </span>
                          {pol.expiresAt && (
                            <span className={`text-xs ${new Date(pol.expiresAt) < new Date() ? "text-red-500" : "text-muted-foreground"}`}>
                              Expires: {new Date(pol.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingPolicy(pol);
                              setEditPolicyOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
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

        {/* ===== OVERVIEW TAB ===== */}
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setShareOpen(true)}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </Button>
                      {(() => {
                        const latestPolicy = policies[policies.length - 1];
                        const status = computeDatasetStatus(latestPolicy);
                        const cfg = statusConfig[status];
                        return <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>;
                      })()}
                    </div>
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
                      value={formatDateTime(dataset.createdAt)}
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

              {/* WS-4.1: File Preview */}
              <FilePreview
                datasetId={dataset.id}
                datasetName={dataset.name}
                hasBlob={!!dataset.shelbyBlobName}
              />

              {/* WS-2.4: How to Access Info Panel */}
              <Card className="rounded-xl border-border/50 bg-gradient-to-br from-navy-50/30 to-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4 text-navy-500" />
                    <h2 className="font-display text-base font-semibold text-foreground">
                      How to Access This Dataset
                    </h2>
                  </div>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex gap-3">
                      <Badge variant="secondary" className="h-5 w-5 flex-shrink-0 items-center justify-center p-0 text-[10px]">1</Badge>
                      <p>Ensure an active policy includes the accessor&apos;s wallet address</p>
                    </div>
                    <div className="flex gap-3">
                      <Badge variant="secondary" className="h-5 w-5 flex-shrink-0 items-center justify-center p-0 text-[10px]">2</Badge>
                      <p>Access via API: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">GET /api/datasets/{id.slice(0, 8)}.../download</code></p>
                    </div>
                    <div className="flex gap-3">
                      <Badge variant="secondary" className="h-5 w-5 flex-shrink-0 items-center justify-center p-0 text-[10px]">3</Badge>
                      <p>Each download consumes one read quota and creates a verifiable proof</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Download + Evidence Pack */}
            <div className="space-y-6">
              {/* Download Dataset */}
              <Card className="rounded-xl border-border/50">
                <CardContent className="pt-6">
                  <h2 className="mb-1 font-display text-base font-semibold text-foreground">
                    Download Dataset
                  </h2>
                  <p className="mb-5 text-xs text-muted-foreground">
                    Download and create access proof automatically
                  </p>

                  <Button
                    onClick={handleDownloadDataset}
                    disabled={downloading || !dataset.shelbyBlobName}
                    className="w-full bg-gradient-to-r from-gold-500 to-teal-500 text-white border-0 hover:from-gold-400 hover:to-teal-400"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : !dataset.shelbyBlobName ? (
                      "No blob available"
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download Dataset
                      </>
                    )}
                  </Button>

                  {downloadError && (
                    <Alert variant="destructive" className="mt-3 rounded-xl">
                      <AlertDescription>{downloadError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Evidence Pack */}
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

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={downloadEvidence}
                          className="flex-1 hover:border-gold-500/30 hover:text-gold-600"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShareOpen(true)}
                          className="flex-1 hover:border-gold-500/30 hover:text-gold-600"
                        >
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                      </div>
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

        {/* ===== ANALYTICS TAB (WS-6.3) ===== */}
        <TabsContent value="analytics">
          <AnalyticsPanel datasetId={id} />
        </TabsContent>
      </Tabs>

      {/* WS-1.3 + WS-2: Dialogs */}
      <CreatePolicyDialog
        open={createPolicyOpen}
        onOpenChange={setCreatePolicyOpen}
        datasets={[{ id: dataset.id, name: dataset.name }]}
        onCreated={refreshPolicies}
      />

      {editingPolicy && (
        <EditPolicyDialog
          open={editPolicyOpen}
          onOpenChange={setEditPolicyOpen}
          policy={{
            id: editingPolicy.id,
            datasetId: dataset.id,
            datasetName: dataset.name,
            version: editingPolicy.version,
            allowedAccessors: editingPolicy.allowedAccessors,
            maxReads: editingPolicy.maxReads,
            expiresAt: editingPolicy.expiresAt ? new Date(editingPolicy.expiresAt).toISOString() : null,
          }}
          onUpdated={refreshPolicies}
        />
      )}

      <ShareDatasetDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        evidencePackId={evidence?.id ?? null}
        datasetName={dataset.name}
        onGenerateEvidence={handleGenerateEvidence}
      />
    </div>
  );
}
