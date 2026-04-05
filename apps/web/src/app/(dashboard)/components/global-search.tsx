"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Badge,
} from "@forsety/ui";
import { Search, Database, Loader2, AlertCircle } from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  type: string;
  score?: number;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
      setSelectedIndex(-1);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&type=dataset&limit=8`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Search failed (${res.status})`);
      }
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    router.push(`/dashboard/${result.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev < results.length - 1 ? prev + 1 : 0;
        resultRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : results.length - 1;
        resultRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "\u2318K" : "Ctrl+K"}
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl p-0 gap-0">
          <DialogTitle className="sr-only">Search datasets</DialogTitle>
          <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search datasets..."
              className="border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {!error && results.length === 0 && query.trim().length >= 2 && !loading && (
              <div className="flex flex-col items-center gap-2 py-8">
                <Database className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No results found</p>
              </div>
            )}

            {!error && results.length === 0 && query.trim().length < 2 && (
              <div className="flex flex-col items-center gap-2 py-8">
                <Search className="h-5 w-5 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Type to search datasets...</p>
              </div>
            )}

            {results.map((r, i) => (
              <button
                key={r.id}
                ref={(el) => { resultRefs.current[i] = el; }}
                onClick={() => handleSelect(r)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/20 last:border-0 ${
                  i === selectedIndex
                    ? "bg-gold-50/60 dark:bg-gold-500/10"
                    : "hover:bg-muted/30"
                }`}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gold-50">
                  <Database className="h-3.5 w-3.5 text-gold-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{r.id.slice(0, 12)}...</p>
                </div>
                <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                  {r.type}
                </Badge>
              </button>
            ))}
          </div>

          {/* Footer with keyboard hints */}
          {(results.length > 0 || query.trim().length >= 2) && (
            <div className="flex items-center gap-3 border-t border-border/40 px-4 py-2">
              <span className="text-[10px] text-muted-foreground">
                <kbd className="rounded border border-border/60 bg-muted/50 px-1 py-0.5 font-mono">{"\u2191\u2193"}</kbd> navigate
              </span>
              <span className="text-[10px] text-muted-foreground">
                <kbd className="rounded border border-border/60 bg-muted/50 px-1 py-0.5 font-mono">{"\u21B5"}</kbd> select
              </span>
              <span className="text-[10px] text-muted-foreground">
                <kbd className="rounded border border-border/60 bg-muted/50 px-1 py-0.5 font-mono">esc</kbd> close
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
