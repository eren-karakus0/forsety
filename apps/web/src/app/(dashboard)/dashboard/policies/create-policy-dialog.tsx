"use client";

import { useState } from "react";
import { createPolicy } from "../actions";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
} from "@forsety/ui";
import { Loader2 } from "lucide-react";

interface CreatePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasets: Array<{ id: string; name: string }>;
  onCreated: () => void;
}

export function CreatePolicyDialog({
  open,
  onOpenChange,
  datasets,
  onCreated,
}: CreatePolicyDialogProps) {
  const { executeWithSignature } = useSignedAction();
  const [datasetId, setDatasetId] = useState("");
  const [accessors, setAccessors] = useState("");
  const [maxReads, setMaxReads] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datasetId || !accessors.trim()) {
      setError("Dataset and allowed accessors are required");
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
        "Create policy",
        (sig) => createPolicy({
          datasetId,
          allowedAccessors,
          maxReads: maxReads ? parseInt(maxReads, 10) : undefined,
          expiresAt: expiresAt || undefined,
        }, sig)
      );

      setSubmitting(false);

      if (result.success) {
        setDatasetId("");
        setAccessors("");
        setMaxReads("");
        setExpiresAt("");
        onOpenChange(false);
        onCreated();
      } else {
        setError(result.error ?? "Failed to create policy");
      }
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Failed to create policy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Create Policy</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Dataset</Label>
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Select a dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  Creating...
                </>
              ) : (
                "Create Policy"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
