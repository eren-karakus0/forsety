"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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

interface EvidenceResult {
  json: Record<string, unknown>;
  hash: string;
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
  const [evidence, setEvidence] = useState<EvidenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/datasets/${id}`, {
      headers: { "x-api-key": "demo" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .catch(() => setError("Failed to load dataset"))
      .finally(() => setLoading(false));
  }, [id]);

  const generateEvidence = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/datasets/${id}/evidence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "demo",
        },
      });
      if (!res.ok) throw new Error("Generation failed");
      const result = await res.json();
      setEvidence(result);
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-navy-400" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
        </svg>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-navy-600">Dataset not found</p>
        <Link href="/dashboard" className="text-sm text-gold-600 hover:underline">
          Back to datasets
        </Link>
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="text-navy-700">{dataset.name}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Metadata */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dataset Info */}
          <div className="rounded-xl border border-navy-200/60 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="font-display text-xl font-bold text-navy-800">
                {dataset.name}
              </h1>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
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
          </div>

          {/* Licenses */}
          <div className="rounded-xl border border-navy-200/60 bg-white p-6 shadow-sm">
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
                      <span className="rounded bg-gold-100 px-2 py-0.5 font-mono text-xs font-medium text-gold-800">
                        {lic.spdxType}
                      </span>
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
          </div>
        </div>

        {/* Right: Evidence Pack */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gold-300/60 bg-gradient-to-b from-gold-50/60 to-white p-6 shadow-sm">
            <h2 className="mb-1 font-display text-base font-semibold text-navy-800">
              Evidence Pack
            </h2>
            <p className="mb-5 text-xs text-navy-500">
              Generate a cryptographic evidence pack for this dataset
            </p>

            {!evidence ? (
              <button
                onClick={generateEvidence}
                disabled={generating}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-navy-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    Generate Evidence Pack
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-sm font-medium text-emerald-700">
                      Pack Generated
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] text-emerald-600 break-all">
                    Hash: {evidence.hash}
                  </p>
                </div>

                <button
                  onClick={downloadEvidence}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-navy-200 bg-white py-2.5 text-sm font-medium text-navy-700 transition-all hover:bg-navy-50 hover:border-navy-300"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Download JSON
                </button>
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Evidence JSON Preview */}
          {evidence && (
            <div className="rounded-xl border border-navy-200/60 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-navy-100 bg-navy-50/50 px-4 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                  JSON Preview
                </span>
              </div>
              <pre className="max-h-80 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-navy-600">
                {JSON.stringify(evidence.json, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
