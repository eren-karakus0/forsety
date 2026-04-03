"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  toast,
} from "@forsety/ui";
import { Copy, Check, Layers } from "lucide-react";
import { createShareLink } from "../actions";
import { useSignedAction } from "@/hooks/use-signed-action";

interface ShareDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidencePackId: string | null;
  datasetName: string;
  onGenerateEvidence: () => void;
}

export function ShareDatasetDialog({
  open,
  onOpenChange,
  evidencePackId,
  datasetName,
  onGenerateEvidence,
}: ShareDatasetDialogProps) {
  const { executeWithSignature } = useSignedAction();
  const [mode, setMode] = useState<"full" | "redacted">("redacted");
  const [ttlHours, setTtlHours] = useState("168"); // 7 days default
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    if (!evidencePackId) return;
    setLoading(true);
    try {
      const result = await executeWithSignature(
        `Share dataset: ${datasetName}`,
        (sig) => createShareLink({
          evidencePackId,
          mode,
          ttlHours: parseInt(ttlHours, 10),
        }, sig)
      );
      if (!result.success) {
        toast.error(result.error ?? "Failed to create share link");
        return;
      }
      setShareUrl(result.url!);
      toast.success("Share link created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create share link");
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => {
      setShareUrl(null);
      setCopied(false);
      setMode("redacted");
      setTtlHours("168");
    }, 200);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Share Dataset</DialogTitle>
          <DialogDescription>
            Create a verification link for {datasetName}
          </DialogDescription>
        </DialogHeader>

        {!evidencePackId ? (
          <div className="space-y-4">
            <Alert className="rounded-xl border-amber-200 bg-amber-50/50">
              <AlertDescription className="text-sm">
                You need to generate an evidence pack before sharing. Evidence packs provide cryptographic proof of your dataset&apos;s integrity.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => { handleClose(); onGenerateEvidence(); }}>
                <Layers className="mr-2 h-4 w-4" />
                Generate Evidence First
              </Button>
            </DialogFooter>
          </div>
        ) : shareUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <Label className="text-xs text-muted-foreground">Share URL</Label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono text-xs">
                  {shareUrl}
                </code>
                <Button variant="outline" size="sm" onClick={copyUrl}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sharing Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "full" | "redacted")}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="redacted">Redacted (accessor addresses hidden)</SelectItem>
                  <SelectItem value="full">Full (all details visible)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Link Expiration</Label>
              <Select value={ttlHours} onValueChange={setTtlHours}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                  <SelectItem value="720">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="bg-gradient-to-r from-gold-500 to-teal-500 text-white border-0"
              >
                {loading ? "Creating..." : "Create Share Link"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
