/**
 * Centralized file extension allowlist.
 * Forsety is a license/privacy layer — all content types should be supported.
 * Shared by: upload page (client), datasets API route (server), dataset action (server).
 */
export const ALLOWED_EXTENSIONS = [
  // Data
  ".csv", ".json", ".jsonl", ".tsv", ".parquet", ".arrow", ".ndjson", ".xml", ".yaml", ".yml",
  // Document
  ".txt", ".md", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".rtf",
  // Image
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".ico", ".avif",
  // Audio
  ".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma",
  // Video
  ".mp4", ".webm", ".mov", ".avi", ".mkv", ".wmv",
  // Archive
  ".zip", ".tar.gz", ".tar", ".gz", ".rar", ".7z",
  // Code
  ".py", ".js", ".ts", ".rs", ".go", ".java", ".c", ".cpp", ".h", ".sql",
  // Model
  ".onnx", ".pt", ".safetensors", ".bin", ".h5", ".ckpt",
] as const;

/** Human-readable summary for error messages. */
export const ALLOWED_EXTENSIONS_SUMMARY =
  "CSV, JSON, PDF, images, audio, video, documents, archives, code, and ML models";

/** Check if a filename has an allowed extension. */
export function hasAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
