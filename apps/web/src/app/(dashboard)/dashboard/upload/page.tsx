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
import { Upload, Check, Loader2, ArrowRight } from "lucide-react";

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
          <Card
            className={`cursor-pointer border-2 border-dashed transition-all ${
              dragOver
                ? "border-gold-500 bg-gold-50/50"
                : file
                  ? "border-emerald-300 bg-emerald-50/30"
                  : "border-navy-200 hover:border-navy-300 hover:bg-navy-50/30"
            }`}
          >
            <CardContent className="relative py-10">
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                      <Check className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-navy-800">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs text-navy-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100">
                      <Upload className="h-5 w-5 text-navy-500" />
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
            </CardContent>
          </Card>

          {/* Name */}
          <div className="space-y-2">
            <Label>Dataset Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ImageNet Training Subset"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the dataset..."
              rows={3}
            />
          </div>

          {/* License Select */}
          <div className="space-y-2">
            <Label>License Type</Label>
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
                  <span
                    className={`block text-sm font-medium ${
                      license === opt.value ? "text-gold-700" : "text-navy-700"
                    }`}
                  >
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
          <div className="space-y-2">
            <Label>Owner Address</Label>
            <Input
              value={ownerAddress}
              onChange={(e) => setOwnerAddress(e.target.value)}
              placeholder="0x..."
              className="font-mono"
            />
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Cancel</Link>
            </Button>
            <Button type="submit" disabled={!isValid || submitting}>
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
        </form>
      </div>
    </div>
  );
}
