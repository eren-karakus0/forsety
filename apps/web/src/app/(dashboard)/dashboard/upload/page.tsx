"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { uploadDataset } from "../actions";

const LICENSE_OPTIONS = [
  { value: "CC-BY-4.0", label: "CC BY 4.0", desc: "Attribution" },
  { value: "CC-BY-SA-4.0", label: "CC BY-SA 4.0", desc: "Attribution + ShareAlike" },
  { value: "MIT", label: "MIT", desc: "Permissive" },
  { value: "Apache-2.0", label: "Apache 2.0", desc: "Permissive + Patent" },
  { value: "CC0-1.0", label: "CC0 1.0", desc: "Public Domain" },
];

export default function UploadPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [license, setLicense] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("description", description);
      formData.set("license", license);
      formData.set("ownerAddress", ownerAddress);
      if (file) formData.set("file", file);

      const result = await uploadDataset(formData);

      if (!result.success) {
        throw new Error(result.error ?? "Upload failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = name && license && ownerAddress && file;

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
        <span className="text-navy-700">Upload</span>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy-800">
            Upload Dataset
          </h1>
          <p className="mt-1.5 text-sm text-navy-500">
            Upload a dataset to Shelby Protocol with license metadata
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all ${
              dragOver
                ? "border-gold-500 bg-gold-50/50"
                : file
                  ? "border-emerald-300 bg-emerald-50/30"
                  : "border-navy-200 bg-white hover:border-navy-300 hover:bg-navy-50/30"
            }`}
          >
            <input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {file ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-navy-800">{file.name}</p>
                <p className="mt-1 text-xs text-navy-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-navy-500">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-navy-700">
                  Drop your file here, or click to browse
                </p>
                <p className="mt-1 text-xs text-navy-400">
                  Any file type supported
                </p>
              </>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-500">
              Dataset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ImageNet Training Subset"
              className="w-full rounded-lg border border-navy-200 bg-white px-4 py-2.5 text-sm text-navy-800 outline-none transition-all placeholder:text-navy-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-500">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the dataset..."
              rows={3}
              className="w-full rounded-lg border border-navy-200 bg-white px-4 py-2.5 text-sm text-navy-800 outline-none transition-all placeholder:text-navy-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 resize-none"
            />
          </div>

          {/* License Select */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-500">
              License Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LICENSE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLicense(opt.value)}
                  className={`rounded-lg border px-3 py-3 text-left transition-all ${
                    license === opt.value
                      ? "border-gold-500 bg-gold-50 ring-2 ring-gold-500/20"
                      : "border-navy-200 bg-white hover:border-navy-300 hover:bg-navy-50/50"
                  }`}
                >
                  <span className={`block text-sm font-medium ${license === opt.value ? "text-gold-700" : "text-navy-700"}`}>
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-navy-400">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Owner Address */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-500">
              Owner Address
            </label>
            <input
              type="text"
              value={ownerAddress}
              onChange={(e) => setOwnerAddress(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-navy-200 bg-white px-4 py-2.5 font-mono text-sm text-navy-800 outline-none transition-all placeholder:text-navy-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/dashboard"
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-navy-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  Upload & Register
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
