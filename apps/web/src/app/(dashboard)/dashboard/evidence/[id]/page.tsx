"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchEvidencePackById, createShareLink } from "../../actions";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@forsety/ui";
import {
  Download,
  Layers,
  Check,
  ChevronRight,
  Database,
  Shield,
  Eye,
  Users,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Share2,
  Copy,
  FileText,
} from "lucide-react";
// Dynamically imported on button click to reduce bundle size
type PdfExportModule = typeof import("@/lib/pdf-export");
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSignedAction } from "@/hooks/use-signed-action";
import { triggerDownload } from "@/lib/download";
import { formatDateTime } from "@/lib/format";
import { ConnectWalletCTA } from "../../../components/connect-wallet-cta";

interface EvidencePackDetail {
  id: string;
  datasetId: string;
  datasetName: string;
  packJson: Record<string, unknown>;
  packJsonCanonical: string | null;
  packHash: string;
  generatedAt: string;
  generatedBy: string | null;
}

type PackData = {
  version?: string;
  generatedAt?: string;
  dataset?: {
    id?: string;
    name?: string;
    description?: string | null;
    blobHash?: string | null;
    ownerAddress?: string;
    sizeBytes?: number | null;
  };
  licenses?: Array<{
    id?: string;
    spdxType?: string;
    grantorAddress?: string;
  }>;
  policies?: Array<{
    id?: string;
    version?: number;
    hash?: string | null;
    allowedAccessors?: string[];
    maxReads?: number | null;
    readsConsumed?: number;
    expiresAt?: string | null;
  }>;
  accessLog?: Array<{
    id?: string;
    accessorAddress?: string;
    operationType?: string;
    readProof?: string | null;
    timestamp?: string;
  }>;
  agentActivity?: Array<{
    agentId?: string | null;
    toolName?: string | null;
    status?: string;
    timestamp?: string;
  }>;
};

export default function EvidenceDetailPage() {
  const { isAuthenticated } = useAuthGuard();
  const { executeWithSignature } = useSignedAction();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<EvidencePackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<"match" | "mismatch" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMode, setShareMode] = useState<"full" | "redacted">("full");
  const [shareTtl, setShareTtl] = useState("24");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchEvidencePackById(id)
      .then((d) => setData(d as EvidencePackDetail | null))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated]);

  const handleVerify = async () => {
    if (!data) return;
    setVerifying(true);
    try {
      // Use canonical JSON if available (deterministic), fallback to stringify
      const jsonStr = data.packJsonCanonical ?? JSON.stringify(data.packJson);
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(jsonStr));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const clientHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setVerifyResult(clientHash === data.packHash ? "match" : "mismatch");
    } catch {
      setVerifyResult("mismatch");
    } finally {
      setVerifying(false);
    }
  };

  const downloadJson = () => {
    if (!data) return;
    triggerDownload(
      JSON.stringify(data.packJson, null, 2),
      `evidence-pack-${data.packHash.slice(0, 8)}.json`,
      "application/json"
    );
  };

  const downloadPdf = async () => {
    if (!data) return;
    const { generateEvidencePackPdf } = await import("@/lib/pdf-export") as PdfExportModule;
    const pdf = await generateEvidencePackPdf(data.packJson as Parameters<typeof generateEvidencePackPdf>[0], data.packHash);
    pdf.save(`evidence-pack-${data.packHash.slice(0, 8)}.pdf`);
    toast.success("PDF exported");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ConnectWalletCTA
        title="Connect to view evidence pack"
        description="Connect your wallet to access cryptographic evidence details and verification"
        icon={Layers}
        variant="full-page"
      />
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-50">
          <Layers className="h-5 w-5 text-gold-400" />
        </div>
        <p className="text-sm font-medium text-foreground">Evidence pack not found</p>
        <Button variant="link" asChild>
          <Link href="/dashboard/evidence">Back to evidence</Link>
        </Button>
      </div>
    );
  }

  const pack = data.packJson as PackData;

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="transition-colors hover:text-gold-600">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/dashboard/evidence" className="transition-colors hover:text-gold-600">
          Evidence
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground font-mono text-xs">
          {data.packHash.slice(0, 8)}...
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dataset Info */}
          <Card className="overflow-hidden rounded-xl">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-gold-500" />
                <CardTitle className="text-sm font-semibold">Dataset Info</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between border-b border-border/30 pb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</span>
                  <Link href={`/dashboard/${data.datasetId}`} className="text-sm font-medium text-foreground hover:text-gold-600 transition-colors">
                    {pack.dataset?.name ?? data.datasetName}
                  </Link>
                </div>
                {pack.dataset?.blobHash && (
                  <div className="flex items-start justify-between border-b border-border/30 pb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Blob Hash</span>
                    <span className="font-mono text-xs text-muted-foreground break-all max-w-[60%] text-right">{pack.dataset.blobHash}</span>
                  </div>
                )}
                {pack.dataset?.ownerAddress && (
                  <div className="flex items-start justify-between border-b border-border/30 pb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Owner</span>
                    <span className="font-mono text-xs text-muted-foreground">{pack.dataset.ownerAddress.slice(0, 16)}...</span>
                  </div>
                )}
                {pack.dataset?.sizeBytes != null && (
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Size</span>
                    <span className="text-sm text-foreground">{pack.dataset.sizeBytes} bytes</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Licenses */}
          {pack.licenses && pack.licenses.length > 0 && (
            <Card className="overflow-hidden rounded-xl">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-teal-500" />
                  <CardTitle className="text-sm font-semibold">Licenses</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {pack.licenses.map((lic, i) => (
                    <div key={lic.id ?? i} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                      <Badge variant="secondary" className="font-mono text-xs">{lic.spdxType}</Badge>
                      {lic.grantorAddress && (
                        <span className="font-mono text-[10px] text-muted-foreground">{lic.grantorAddress.slice(0, 10)}...</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Policies */}
          {pack.policies && pack.policies.length > 0 && (
            <Card className="overflow-hidden rounded-xl">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-violet-500" />
                  <CardTitle className="text-sm font-semibold">Policies ({pack.policies.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {pack.policies.map((pol, i) => (
                    <div key={pol.id ?? i} className="px-5 py-4 transition-colors hover:bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Badge className="text-[10px]">v{pol.version}</Badge>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{pol.readsConsumed ?? 0}/{pol.maxReads ?? "∞"} reads</span>
                          {pol.expiresAt && (
                            <span className={new Date(pol.expiresAt) < new Date() ? "text-red-500" : ""}>
                              Expires: {new Date(pol.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      {pol.hash && (
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                          Hash: {pol.hash.slice(0, 24)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Access Log */}
          {pack.accessLog && pack.accessLog.length > 0 && (
            <Card className="overflow-hidden rounded-xl">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gold-500" />
                  <CardTitle className="text-sm font-semibold">Access Log ({pack.accessLog.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {pack.accessLog.map((log, i) => (
                    <div key={log.id ?? i} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/20">
                      <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted/60">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                            {log.operationType}
                          </Badge>
                          {log.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(log.timestamp)}
                            </span>
                          )}
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
              </CardContent>
            </Card>
          )}

          {/* Agent Activity */}
          {pack.agentActivity && pack.agentActivity.length > 0 && (
            <Card className="overflow-hidden rounded-xl">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-500" />
                  <CardTitle className="text-sm font-semibold">Agent Activity ({pack.agentActivity.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {pack.agentActivity.map((activity, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/20">
                      <div className="flex items-center gap-2">
                        {activity.toolName && (
                          <Badge variant="secondary" className="font-mono text-[10px]">{activity.toolName}</Badge>
                        )}
                        <Badge variant={activity.status === "success" ? "default" : "destructive"}>
                          {activity.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {activity.agentId && (
                          <span className="font-mono text-[10px]">{activity.agentId.slice(0, 8)}...</span>
                        )}
                        {activity.timestamp && (
                          <span>{formatDateTime(activity.timestamp)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Integrity Verification */}
          <Card className="stat-card-gold rounded-xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5 text-gold-500" />
                <h2 className="font-display text-base font-semibold text-foreground">
                  Integrity Check
                </h2>
              </div>

              {verifyResult === null ? (
                <Button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="w-full bg-gradient-to-r from-gold-500 to-teal-500 text-white border-0 hover:from-gold-400 hover:to-teal-400"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Verify Hash
                    </>
                  )}
                </Button>
              ) : verifyResult === "match" ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Integrity Verified</span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-600">
                    Client-side hash matches the stored hash
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Hash Mismatch</span>
                  </div>
                  <p className="mt-1 text-xs text-red-600">
                    The evidence pack may have been tampered with
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Download & Share */}
          <Card className="rounded-xl">
            <CardContent className="space-y-3 pt-6">
              <Button
                variant="outline"
                onClick={downloadJson}
                className="w-full hover:border-gold-500/30 hover:text-gold-600"
              >
                <Download className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
              <Button
                variant="outline"
                onClick={downloadPdf}
                data-umami-event="download-evidence"
                className="w-full hover:border-violet-500/30 hover:text-violet-600"
              >
                <FileText className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShareOpen(true); setShareUrl(null); setCopied(false); }}
                data-umami-event="share-evidence"
                className="w-full hover:border-teal-500/30 hover:text-teal-600"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </CardContent>
          </Card>

          {/* Share Dialog */}
          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Share Evidence Pack</DialogTitle>
              </DialogHeader>
              {!shareUrl ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <Select value={shareMode} onValueChange={(v) => setShareMode(v as "full" | "redacted")}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full (all details visible)</SelectItem>
                        <SelectItem value="redacted">Redacted (addresses truncated)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expires in (hours)</Label>
                    <Input
                      type="number"
                      value={shareTtl}
                      onChange={(e) => setShareTtl(e.target.value)}
                      min={1}
                      max={720}
                      className="rounded-lg"
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      setShareLoading(true);
                      try {
                        const result = await executeWithSignature(
                          "Create share link",
                          (sig) => createShareLink({
                            evidencePackId: data.id,
                            mode: shareMode,
                            ttlHours: parseInt(shareTtl, 10) || 24,
                          }, sig)
                        );
                        if (result.success && result.url) {
                          setShareUrl(result.url);
                          toast.success("Share link created");
                        }
                      } catch {
                        // User rejected wallet signature or error
                      } finally {
                        setShareLoading(false);
                      }
                    }}
                    disabled={shareLoading}
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white border-0 hover:from-teal-400 hover:to-teal-500"
                  >
                    {shareLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Link"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                    <p className="break-all font-mono text-xs text-foreground">{shareUrl}</p>
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      toast.success("Copied to clipboard");
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Metadata */}
          <Card className="rounded-xl">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between border-b border-border/30 pb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Version</span>
                  <span className="text-sm text-foreground">{pack.version ?? "-"}</span>
                </div>
                <div className="flex items-start justify-between border-b border-border/30 pb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Generated</span>
                  <span className="text-sm text-foreground">
                    {formatDateTime(data.generatedAt)}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hash</span>
                  <span className="font-mono text-[10px] text-muted-foreground break-all max-w-[60%] text-right">
                    {data.packHash}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
