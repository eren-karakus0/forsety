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
} from "@forsety/ui";
import { Upload, Check, Loader2, ArrowRight, FileUp } from "lucide-react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { ConnectWalletCTA } from "../../components/connect-wallet-cta";
import { WalletSelector } from "@/components/wallet-selector";

const LICENSE_OPTIONS = [
  { value: "CC-BY-4.0", label: "CC BY 4.0", desc: "Attribution" },
  { value: "CC-BY-SA-4.0", label: "CC BY-SA 4.0", desc: "Attribution + ShareAlike" },
  { value: "MIT", label: "MIT", desc: "Permissive" },
  { value: "Apache-2.0", label: "Apache 2.0", desc: "Permissive + Patent" },
  { value: "CC0-1.0", label: "CC0 1.0", desc: "Public Domain" },
];

export default function UploadPage() {
  const { isAuthenticated, selectorOpen, setSelectorOpen } = useAuthGuard();
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

  const isValid = name && license && file;

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

        {!isAuthenticated ? (
          <>
            <ConnectWalletCTA
              title="Connect your wallet to upload datasets"
              description="You need to connect your wallet before uploading datasets to Shelby Protocol"
              icon={Upload}
            />
            <WalletSelector open={selectorOpen} onOpenChange={setSelectorOpen} />
          </>
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
                className="flex flex-col items-center justify-center"
              >
                <input
                  type="file"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
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
                      Any file type supported
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Name */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dataset Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ImageNet Training Subset"
              className="rounded-lg"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Textarea
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LICENSE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLicense(opt.value)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                    license === opt.value
                      ? "border-gold-500 bg-gold-50/60 shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                      : "border-navy-200 bg-white hover:border-gold-400/40 hover:bg-gold-50/20"
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
