"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  toast,
} from "@forsety/ui";
import { fetchDatasetsList, updateAgentPermissions } from "../../actions";
import { useSignedAction } from "@/hooks/use-signed-action";

const AVAILABLE_PERMISSIONS = [
  "memory.read",
  "memory.write",
  "dataset.read",
  "policy.read",
  "policy.write",
  "dataset.write",
] as const;

interface EditAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: {
    id: string;
    name: string;
    permissions: string[];
    allowedDatasets: string[];
  };
  onUpdated: () => void;
}

export function EditAgentDialog({ open, onOpenChange, agent, onUpdated }: EditAgentDialogProps) {
  const { executeWithSignature } = useSignedAction();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(agent.permissions);
  const [allDatasets, setAllDatasets] = useState(agent.allowedDatasets.includes("*"));
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>(
    agent.allowedDatasets.filter((d) => d !== "*")
  );
  const [datasets, setDatasets] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedPermissions(agent.permissions);
      setAllDatasets(agent.allowedDatasets.includes("*"));
      setSelectedDatasets(agent.allowedDatasets.filter((d) => d !== "*"));
      fetchDatasetsList().then(setDatasets).catch(() => {});
    }
  }, [open, agent]);

  function togglePermission(perm: string) {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  function toggleDataset(datasetId: string) {
    setSelectedDatasets((prev) =>
      prev.includes(datasetId) ? prev.filter((d) => d !== datasetId) : [...prev, datasetId]
    );
  }

  const scopeValid = allDatasets || selectedDatasets.length > 0;

  async function handleSave() {
    if (!scopeValid) return;
    setLoading(true);
    try {
      const res = await executeWithSignature(
        `Update agent permissions: ${agent.name}`,
        (sig) => updateAgentPermissions(agent.id, {
          permissions: selectedPermissions,
          allowedDatasets: allDatasets ? ["*"] : selectedDatasets,
        }, sig)
      );
      if (!res.success) {
        toast.error(res.error ?? "Update failed");
        return;
      }
      toast.success("Agent permissions updated");
      onOpenChange(false);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Permissions</DialogTitle>
          <DialogDescription>
            Update permissions and dataset scope for {agent.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Permissions</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label
                  key={perm}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="rounded"
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Dataset Scope</Label>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Select which datasets this agent can access
            </p>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors hover:bg-muted/50 mb-2">
              <input
                type="checkbox"
                checked={allDatasets}
                onChange={(e) => {
                  setAllDatasets(e.target.checked);
                  if (e.target.checked) setSelectedDatasets([]);
                }}
                className="rounded"
              />
              All Datasets (wildcard)
            </label>
            {!allDatasets && (
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border p-2">
                {datasets.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground py-2 text-center">No datasets found</p>
                ) : (
                  datasets.map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDatasets.includes(d.id)}
                        onChange={() => toggleDataset(d.id)}
                        className="rounded"
                      />
                      <span className="truncate">{d.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                        {d.id.slice(0, 8)}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
            {!scopeValid && (
              <p className="mt-1 text-[11px] text-amber-600">Select at least one dataset or enable wildcard</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !scopeValid}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
