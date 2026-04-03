"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Badge,
} from "@forsety/ui";
import { Search, Database, Loader2 } from "lucide-react";

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

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=dataset&limit=8`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(`/dashboard/${result.id}`);
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
        <DialogContent className="sm:max-w-lg p-0 gap-0">
          <DialogTitle className="sr-only">Search datasets</DialogTitle>
          <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search datasets..."
              className="border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 && query.length >= 2 && !loading && (
              <div className="flex flex-col items-center gap-2 py-8">
                <Database className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No results found</p>
              </div>
            )}

            {results.length === 0 && query.length < 2 && (
              <div className="flex flex-col items-center gap-2 py-8">
                <p className="text-xs text-muted-foreground">Type to search datasets...</p>
              </div>
            )}

            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 border-b border-border/20 last:border-0"
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
        </DialogContent>
      </Dialog>
    </>
  );
}
