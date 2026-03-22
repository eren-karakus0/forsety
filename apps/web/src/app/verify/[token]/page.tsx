"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@forsety/ui";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Database,
  Shield,
  Eye,
  Clock,
  Loader2,
  Check,
} from "lucide-react";

type PackData = {
  version?: string;
  generatedAt?: string;
  dataset?: {
    name?: string;
    description?: string | null;
    blobHash?: string | null;
    ownerAddress?: string;
    sizeBytes?: number | null;
  };
  licenses?: Array<{
    spdxType?: string;
    grantorAddress?: string;
  }>;
  policies?: Array<{
    version?: number;
    allowedAccessors?: string[];
    maxReads?: number | null;
    readsConsumed?: number;
    expiresAt?: string | null;
  }>;
  accessLog?: Array<{
    accessorAddress?: string;
    operationType?: string;
    timestamp?: string;
  }>;
};

interface VerifyData {
  mode: "full" | "redacted";
  expiresAt: string;
  pack: {
    packJson: PackData;
    packJsonCanonical: string | null;
    packHash: string;
    generatedAt: string;
  };
}

export default function VerifyPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<VerifyData | null>(null);
  const [status, setStatus] = useState<"loading" | "valid" | "expired" | "not-found">("loading");
  const [verifyResult, setVerifyResult] = useState<"match" | "mismatch" | "redacted" | null>(null);

  useEffect(() => {
    fetch(`/api/verify/${token}`)
      .then(async (res) => {
        if (res.status === 404) {
          setStatus("not-found");
          return;
        }
        if (!res.ok) {
          setStatus("not-found");
          return;
        }
        const json = await res.json();
        setData(json);
        setStatus("valid");

        // Auto-verify hash: skip for redacted mode (canonical is stripped)
        if (json.mode === "redacted") {
          setVerifyResult("redacted");
        } else {
          try {
            const jsonStr = json.pack.packJsonCanonical ?? JSON.stringify(json.pack.packJson);
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(jsonStr));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const clientHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
            setVerifyResult(clientHash === json.pack.packHash ? "match" : "mismatch");
          } catch {
            setVerifyResult("mismatch");
          }
        }
      })
      .catch(() => setStatus("not-found"));
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
        <p className="text-sm text-muted-foreground">Verifying evidence pack...</p>
      </div>
    );
  }

  if (status === "not-found" || status === "expired") {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground">
          {status === "expired" ? "Link Expired" : "Not Found"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {status === "expired"
            ? "This verification link has expired."
            : "This verification link is invalid or has been removed."}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const pack = data.pack.packJson;

  const bannerConfig = {
    match: {
      title: "Evidence Pack Verified",
      Icon: ShieldCheck,
      borderColor: "border-emerald-500/20",
      bgColor: "bg-emerald-500/5",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    redacted: {
      title: "Evidence Pack — Redacted View",
      Icon: Shield,
      borderColor: "border-amber-500/20",
      bgColor: "bg-amber-500/5",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
    mismatch: {
      title: "Verification Failed",
      Icon: ShieldAlert,
      borderColor: "border-red-500/20",
      bgColor: "bg-red-500/5",
      iconBg: "bg-red-500/10",
      iconColor: "text-red-400",
    },
  } as const;

  const banner = bannerConfig[verifyResult ?? "match"];
  const BannerIcon = banner.Icon;

  return (
    <div className="space-y-6">
      {/* Verification Banner */}
      <Card className={`overflow-hidden rounded-xl ${banner.borderColor} ${banner.bgColor}`}>
        <CardContent className="flex items-center gap-4 p-6">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${banner.iconBg}`}>
            <BannerIcon className={`h-6 w-6 ${banner.iconColor}`} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">
              {banner.title}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Expires: {new Date(data.expiresAt).toLocaleString()}
              </span>
              {data.mode === "redacted" && (
                <Badge variant="secondary" className="text-[10px]">Redacted View</Badge>
              )}
            </div>
          </div>
          {verifyResult && (
            <div className="ml-auto">
              {verifyResult === "match" ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-300">Hash Verified</span>
                </div>
              ) : verifyResult === "redacted" ? (
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-medium text-amber-300">Redacted View</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2">
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                  <span className="text-xs font-medium text-red-300">Hash Mismatch</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dataset */}
          {pack.dataset && (
            <Card className="rounded-xl border-white/10 bg-card">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-gold-400" />
                  <CardTitle className="text-sm font-semibold text-foreground">Dataset</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-sm">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-navy-400 text-xs uppercase tracking-wider font-semibold">Name</span>
                    <span className="text-foreground">{pack.dataset.name}</span>
                  </div>
                  {pack.dataset.blobHash && (
                    <div className="flex justify-between">
                      <span className="text-navy-400 text-xs uppercase tracking-wider font-semibold">Blob Hash</span>
                      <span className="font-mono text-xs text-muted-foreground break-all max-w-[60%] text-right">{pack.dataset.blobHash}</span>
                    </div>
                  )}
                  {pack.dataset.ownerAddress && (
                    <div className="flex justify-between">
                      <span className="text-navy-400 text-xs uppercase tracking-wider font-semibold">Owner</span>
                      <span className="font-mono text-xs text-muted-foreground">{pack.dataset.ownerAddress}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Licenses */}
          {pack.licenses && pack.licenses.length > 0 && (
            <Card className="rounded-xl border-white/10 bg-card">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-teal-400" />
                  <CardTitle className="text-sm font-semibold text-foreground">Licenses</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {pack.licenses.map((lic, i) => (
                    <Badge key={i} variant="secondary" className="font-mono text-xs">
                      {lic.spdxType}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Policies */}
          {pack.policies && pack.policies.length > 0 && (
            <Card className="rounded-xl border-white/10 bg-card">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-violet-400" />
                  <CardTitle className="text-sm font-semibold text-foreground">Policies ({pack.policies.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/10">
                  {pack.policies.map((pol, i) => (
                    <div key={i} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <Badge className="text-[10px]">v{pol.version}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {pol.readsConsumed ?? 0}/{pol.maxReads ?? "∞"} reads
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Access Log */}
          {pack.accessLog && pack.accessLog.length > 0 && (
            <Card className="rounded-xl border-white/10 bg-card">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gold-400" />
                  <CardTitle className="text-sm font-semibold text-foreground">Access Log ({pack.accessLog.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/10">
                  {pack.accessLog.map((log, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                          {log.operationType}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">{log.accessorAddress}</span>
                      </div>
                      {log.timestamp && (
                        <span className="text-xs text-navy-400">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className="rounded-xl border-white/10 bg-card">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-navy-400">
                Pack Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-navy-400 text-xs uppercase tracking-wider font-semibold">Version</span>
                  <span className="text-foreground">{pack.version ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400 text-xs uppercase tracking-wider font-semibold">Generated</span>
                  <span className="text-foreground text-xs">
                    {new Date(data.pack.generatedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-navy-400 text-xs uppercase tracking-wider font-semibold">Hash</span>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground break-all">
                    {data.pack.packHash}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
