"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  toast,
} from "@forsety/ui";
import { UserPlus, Copy, Check } from "lucide-react";
import { registerAgent, fetchDatasetsList } from "../actions";
import { useSignedAction } from "@/hooks/use-signed-action";

const AVAILABLE_PERMISSIONS = [
  "memory.read",
  "memory.write",
  "dataset.read",
  "policy.read",
  "policy.write",
  "dataset.write",
] as const;

export function RegisterAgentDialog() {
  const { executeWithSignature } = useSignedAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    "memory.read",
    "memory.write",
    "dataset.read",
    "policy.read",
  ]);
  const [allDatasets, setAllDatasets] = useState(false);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [datasets, setDatasets] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    apiKey: string;
    agentId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && !result) {
      fetchDatasetsList().then(setDatasets).catch(() => {});
    }
  }, [open, result]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !scopeValid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await executeWithSignature(
        `Register agent: ${name.trim()}`,
        (sig) => registerAgent({
          name: name.trim(),
          description: description.trim() || undefined,
          permissions: selectedPermissions,
          allowedDatasets: allDatasets ? ["*"] : selectedDatasets,
        }, sig)
      );

      setLoading(false);

      if (!res.success) {
        const message = res.error ?? "Registration failed";
        setError(message);
        toast.error(message);
        return;
      }

      setResult({ apiKey: res.apiKey!, agentId: res.agentId! });
      toast.success("Agent registered");
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      toast.error(message);
    }
  }

  async function copyKey() {
    if (!result) return;
    await navigator.clipboard.writeText(result.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setOpen(false);
    // Reset state after close animation — guard against rapid reopen
    setTimeout(() => {
      setOpen((current) => {
        if (!current) {
          setName("");
          setDescription("");
          setSelectedPermissions(["memory.read", "memory.write", "dataset.read", "policy.read"]);
          setAllDatasets(false);
          setSelectedDatasets([]);
          setResult(null);
          setError(null);
          setCopied(false);
        }
        return current;
      });
    }, 200);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Register Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {result ? "Agent Registered" : "Register New Agent"}
          </DialogTitle>
          <DialogDescription>
            {result
              ? "Copy the API key below. It will not be shown again."
              : "Create a new AI agent with RecallVault access."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <Label className="text-xs text-muted-foreground">API Key</Label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono text-xs">
                  {result.apiKey}
                </code>
                <Button variant="outline" size="sm" onClick={copyKey}>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-amber-600">
                Store this key securely. It will not be shown again.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. data-ingestion-bot"
                required
              />
            </div>
            <div>
              <Label htmlFor="agent-desc">Description (optional)</Label>
              <Input
                id="agent-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this agent does"
              />
            </div>
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
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim() || !scopeValid} data-umami-event="register-agent">
                {loading ? "Registering..." : "Register"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
