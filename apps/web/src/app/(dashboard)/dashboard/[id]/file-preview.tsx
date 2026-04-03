"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Skeleton,
} from "@forsety/ui";
import { Eye, Download, FileText } from "lucide-react";

interface PreviewData {
  type: string;
  preview: string | string[][];
  totalSize: number;
  columns?: string[];
  rowCount?: number;
}

interface FilePreviewProps {
  datasetId: string;
  datasetName: string;
  hasBlob: boolean;
}

export function FilePreview({ datasetId, datasetName, hasBlob }: FilePreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function loadPreview() {
    if (loaded) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/datasets/${datasetId}/preview`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError(res.status === 403 ? "Access denied" : "Preview unavailable");
        return;
      }
      const data = await res.json();
      setPreview(data);
      setLoaded(true);
    } catch {
      setError("Failed to load preview");
    } finally {
      setLoading(false);
    }
  }

  if (!hasBlob) return null;

  const ext = datasetName.split(".").pop()?.toLowerCase();
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="overflow-hidden rounded-xl">
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-navy-50/50 to-transparent flex-row items-center justify-between py-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          File Preview
        </CardTitle>
        {!loaded && (
          <Button
            variant="outline"
            size="sm"
            onClick={loadPreview}
            disabled={loading}
            className="h-7 text-xs"
          >
            <Eye className="mr-1.5 h-3 w-3" />
            {loading ? "Loading..." : "Load Preview"}
          </Button>
        )}
        {preview && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{ext?.toUpperCase()}</Badge>
            <span className="text-[10px] text-muted-foreground">{formatBytes(preview.totalSize)}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading && (
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-sm text-muted-foreground">{error}</div>
        )}

        {preview?.type === "tabular" && Array.isArray(preview.preview) && (
          <div className="overflow-x-auto max-h-80">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  {(preview.columns ?? []).map((col, i) => (
                    <TableHead key={i} className="text-[10px] font-semibold uppercase whitespace-nowrap">{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(preview.preview as string[][]).slice(0, 50).map((row, i) => (
                  <TableRow key={i} className="border-border/30">
                    {row.map((cell, j) => (
                      <TableCell key={j} className="text-xs py-1.5 whitespace-nowrap">{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {preview.rowCount && preview.rowCount > 50 && (
              <p className="border-t border-border/30 px-4 py-2 text-[10px] text-muted-foreground text-center">
                Showing 50 of {preview.rowCount} rows
              </p>
            )}
          </div>
        )}

        {(preview?.type === "json" || preview?.type === "text") && typeof preview.preview === "string" && (
          <pre className="max-h-80 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {preview.preview}
          </pre>
        )}

        {preview?.type === "binary" && (
          <div className="flex flex-col items-center gap-3 px-5 py-8">
            <Download className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{preview.preview as string}</p>
            <p className="text-[10px] text-muted-foreground">
              Size: {formatBytes(preview.totalSize)}. Download to view contents.
            </p>
          </div>
        )}

        {!loading && !error && !preview && (
          <div className="flex flex-col items-center gap-2 px-5 py-8">
            <Eye className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Click &quot;Load Preview&quot; to see file contents</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
