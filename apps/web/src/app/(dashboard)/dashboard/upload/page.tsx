"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { uploadDataset } from "../actions";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription,
  toast,
} from "@forsety/ui";
import { Upload, Check, Loader2, ArrowRight, FileUp } from "lucide-react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSignedAction } from "@/hooks/use-signed-action";
import { ConnectWalletCTA } from "../../components/connect-wallet-cta";

const LICENSE_OPTIONS = [
  { value: "CC-BY-4.0", label: "CC BY 4.0", desc: "Attribution" },
  { value: "CC-BY-SA-4.0", label: "CC BY-SA 4.0", desc: "Attribution + ShareAlike" },
  { value: "MIT", label: "MIT", desc: "Permissive" },
  { value: "Apache-2.0", label: "Apache 2.0", desc: "Permissive + Patent" },
  { value: "CC0-1.0", label: "CC0 1.0", desc: "Public Domain" },
];

export default function UploadPage() {
  const { isAuthenticated, isLoading } = useAuthGuard();
  const { executeWithSignature } = useSignedAction();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [license, setLicense] = useState("");
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
      if (file) formData.set("file", file);

      const result = await executeWithSignature(
        `Upload dataset: ${name}`,
        (sig) => uploadDataset(formData, sig)
      );

      if (!result.success) {
        throw new Error(result.error ?? "Upload failed");
      }

      toast.success("Dataset uploaded successfully");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB (must match server limit)
  const ALLOWED_EXTENSIONS = [".csv", ".json", ".txt", ".parquet", ".arrow", ".zip", ".tar.gz", ".jsonl", ".tsv"];
  const nameError = name.length > 0 && name.trim().length < 2 ? "Name must be at least 2 characters" : null;
  const fileError = file
    ? file.size > MAX_FILE_SIZE
      ? "File exceeds 50 MB limit"
      : !ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
        ? "File type not allowed"
        : null
    : null;
  const isValid = name.trim().length >= 2 && license && file && !fileError;

  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-2xl">
        <div className="page-header-accent mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50">
              <Upload className="h-5 w-5 text-navy-600" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Upload Dataset
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Upload a dataset to Shelby Protocol with license metadata
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
            <p className="mt-4 text-sm text-muted-foreground">
              Verifying session...
            </p>
          </div>
        ) : !isAuthenticated ? (
          <ConnectWalletCTA
            title="Connect your wallet to upload datasets"
            description="You need to connect your wallet before uploading datasets to Shelby Protocol"
            icon={Upload}
          />
        ) : <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Zone */}
          <Card
            className={`cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 ${
              dragOver
                ? "border-gold-500 bg-gold-50/30 shadow-[0_0_30px_rgba(212,175,55,0.15)]"
                : file
                  ? "border-emerald-400 bg-emerald-50/20"
                  : "border-navy-200 hover:border-gold-400/50 hover:bg-gold-50/10"
            }`}
          >
            <CardContent className="relative py-12">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const input = e.currentTarget.querySelector<HTMLInputElement>("input[type=file]");
                    input?.click();
                  }
                }}
                className="flex flex-col items-center justify-center"
              >
                <input
                  type="file"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  aria-label="Choose a file to upload"
                />

                {file ? (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                      <Check className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-foreground">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                    </p>
                    {fileError && <p className="mt-1 text-xs text-destructive">{fileError}</p>}
                  </>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-50 to-teal-50">
                      <FileUp className="h-6 w-6 text-gold-500" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-foreground">
                      Drop your file here, or click to browse
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Supported: CSV, JSON, JSONL, TSV, TXT, Parquet, Arrow, ZIP, TAR.GZ
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="dataset-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dataset Name
            </Label>
            <Input
              id="dataset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ImageNet Training Subset"
              className="rounded-lg"
              minLength={2}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="dataset-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="dataset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the dataset..."
              rows={3}
              className="rounded-lg"
            />
          </div>

          {/* License Select */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              License Type
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="License type">
              {LICENSE_OPTIONS.map((opt) => (
                <button
                  role="radio"
                  aria-checked={license === opt.value}
                  key={opt.value}
                  type="button"
                  onClick={() => setLicense(opt.value)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                    license === opt.value
                      ? "border-gold-500 bg-gold-50/60 shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                      : "border-navy-200 bg-card hover:border-gold-400/40 hover:bg-gold-50/20"
                  }`}
                >
                  <span
                    className={`block text-sm font-semibold ${
                      license === opt.value ? "text-gold-700" : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={!isValid || submitting}
              data-umami-event="upload-dataset"
              className="bg-gradient-to-r from-gold-500 to-teal-500 text-white border-0 hover:from-gold-400 hover:to-teal-400"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  Upload & Register
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>}
      </div>
    </div>
  );
}
