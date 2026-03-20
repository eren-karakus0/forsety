"use client";

import { useState, useEffect } from "react";
import { updatePolicy } from "../actions";
import { useSignedAction } from "@/hooks/use-signed-action";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription,
  toast,
} from "@forsety/ui";
import { Loader2, Info } from "lucide-react";

interface PolicyRow {
  id: string;
  datasetId: string;
  datasetName: string;
  version: number;
  allowedAccessors: string[];
  maxReads: number | null;
  expiresAt: string | null;
}

interface EditPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: PolicyRow;
  onUpdated: () => void;
}

export function EditPolicyDialog({
  open,
  onOpenChange,
  policy,
  onUpdated,
}: EditPolicyDialogProps) {
  const { executeWithSignature } = useSignedAction();
  const [accessors, setAccessors] = useState("");
  const [maxReads, setMaxReads] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && policy) {
      setAccessors(policy.allowedAccessors.join("\n"));
      setMaxReads(policy.maxReads?.toString() ?? "");
      setExpiresAt(policy.expiresAt ? policy.expiresAt.split("T")[0] : "");
      setError(null);
    }
  }, [open, policy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessors.trim()) {
      setError("Allowed accessors are required");
      return;
    }

    setSubmitting(true);
    setError(null);

    const allowedAccessors = accessors
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      const result = await executeWithSignature(
        "Update policy",
        (sig) => updatePolicy(policy.id, {
          allowedAccessors,
          maxReads: maxReads ? parseInt(maxReads, 10) : undefined,
          expiresAt: expiresAt || undefined,
        }, sig)
      );

      setSubmitting(false);

      if (result.success) {
        onOpenChange(false);
        onUpdated();
        toast.success("Policy updated");
      } else {
        const message = result.error ?? "Failed to update policy";
        setError(message);
        toast.error(message);
      }
    } catch (err) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : "Failed to update policy";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Policy</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 text-xs text-violet-700">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Updating will create <strong>v{policy.version + 1}</strong> for{" "}
              <strong>{policy.datasetName}</strong>
            </span>
          </div>

          <div className="space-y-2">
            <Label>Allowed Accessors</Label>
            <Textarea
              value={accessors}
              onChange={(e) => setAccessors(e.target.value)}
              placeholder={"One address per line\n0x1234...\n* (for all)"}
              rows={4}
              className="font-mono text-sm rounded-lg"
            />
            <p className="text-xs text-muted-foreground">
              Enter one wallet address per line, or * for public access
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Reads</Label>
              <Input
                type="number"
                value={maxReads}
                onChange={(e) => setMaxReads(e.target.value)}
                placeholder="Unlimited"
                min={1}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Expires At</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="rounded-lg"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="rounded-lg">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-violet-500 to-violet-600 text-white border-0 hover:from-violet-400 hover:to-violet-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Policy"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
