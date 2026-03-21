import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { normalize } from "node:path";
import type {
  ShelbyWrapperConfig,
  UploadResult,
  BlobMetadata,
  BlobCommitments,
} from "./types.js";
import { ForsetyUploadError, ForsetyError, ForsetyValidationError } from "../errors.js";

/** Reject path traversal (.. segments). */
function assertSafePath(filePath: string): void {
  if (normalize(filePath).includes("..")) {
    throw new ForsetyValidationError("Path traversal detected in file path");
  }
}

/** Reject unsafe blob names (only alphanumeric, dots, hyphens, underscores, forward slashes allowed). */
function assertSafeBlobName(name: string): void {
  if (!/^[a-zA-Z0-9._\-/]+$/.test(name)) {
    throw new ForsetyValidationError(
      "Invalid blob name: only alphanumeric, dots, hyphens, underscores, and forward slashes allowed"
    );
  }
}

function toWslPath(windowsPath: string): string {
  return windowsPath
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_m, d: string) => `/mnt/${d.toLowerCase()}`);
}

/** Shell-quote a single argument for bash (POSIX single-quote escaping). */
function shellQuote(arg: string): string {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Shelby CLI wrapper — all commands match `shelby <cmd> --help` contract.
 *
 * CLI contract (v0.0.26):
 *   upload   [source] [destination] -e <expiration> [--output-commitments <file>] [--assume-yes]
 *   download [source] [destination] [-f]
 *   delete   [destination] [--assume-yes]
 *   commitment <input> <output>
 *   account blobs [-a <account-name>]
 *   account balance [address]
 *   context list
 *   --version
 */
export class ShelbyWrapper {
  private config: ShelbyWrapperConfig;

  constructor(config: ShelbyWrapperConfig) {
    this.config = config;
  }

  private exec(args: string[]): string {
    try {
      const cmd = ["shelby", ...args].map(shellQuote).join(" ");
      const result = execFileSync("wsl", ["-e", "bash", "-c", cmd], {
        encoding: "utf-8",
        timeout: 60_000,
      });
      return result.trim();
    } catch (error) {
      throw new ForsetyError(
        `Shelby CLI error: ${error instanceof Error ? error.message : String(error)}`,
        "SHELBY_CLI_ERROR",
        error
      );
    }
  }

  /**
   * Upload a file to Shelby.
   * CLI: shelby upload [source] [destination] -e <expiration> [--output-commitments <file>]
   */
  async uploadDataset(
    filePath: string,
    blobName: string,
    expiration: string = "in 30 days"
  ): Promise<UploadResult> {
    assertSafePath(filePath);
    assertSafeBlobName(blobName);
    try {
      const wslPath = toWslPath(filePath);
      const commitmentsPath = "/tmp/forsety-commitments.json";

      // CLI contract: shelby upload [source] [destination] -e <expiration>
      const output = this.exec([
        "upload", wslPath, blobName,
        "-e", expiration,
        "--output-commitments", commitmentsPath,
        "--assume-yes",
      ]);

      const hash = this.computeFileHash(filePath);
      let sizeBytes = 0;
      try {
        sizeBytes = statSync(filePath).size;
      } catch { /* ignore */ }

      const blobIdMatch = output.match(/blob[_\s]?id[:\s]+(\S+)/i);
      const blobId = blobIdMatch?.[1] ?? blobName;

      return { blobId, blobName, hash, sizeBytes };
    } catch (error) {
      throw new ForsetyUploadError(
        `Failed to upload dataset: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Download a blob from Shelby.
   * CLI: shelby download [source] [destination] -f
   */
  async downloadDataset(
    blobName: string,
    outputPath: string
  ): Promise<void> {
    assertSafeBlobName(blobName);
    assertSafePath(outputPath);
    // CLI contract: shelby download [source] [destination]
    this.exec(["download", blobName, toWslPath(outputPath), "-f"]);
  }

  /**
   * Delete a blob from Shelby.
   * CLI: shelby delete [destination] --assume-yes
   */
  async deleteBlob(blobName: string): Promise<void> {
    assertSafeBlobName(blobName);
    this.exec(["delete", blobName, "--assume-yes"]);
  }

  /**
   * List blobs for an account.
   * CLI: shelby account blobs [-a <account-name>]
   */
  async getAccountBlobs(account?: string): Promise<BlobMetadata[]> {
    const args = ["account", "blobs"];
    if (account) {
      args.push("-a", account);
    }
    const output = this.exec(args);
    const lines = output.split("\n").filter((l) => l.trim().length > 0);

    return lines
      .filter((line) => !line.startsWith("─") && !line.startsWith("Blob"))
      .map((line) => {
        const parts = line.split(/\s{2,}/).map((p) => p.trim());
        return {
          blobId: parts[0] ?? "",
          blobName: parts[1] ?? parts[0] ?? "",
          sizeBytes: parseInt(parts[2] ?? "0", 10) || 0,
          createdAt: parts[3] ?? new Date().toISOString(),
        };
      })
      .filter((b) => b.blobId.length > 0);
  }

  /**
   * Generate commitments for a file.
   * CLI: shelby commitment <input> <output>
   */
  async generateCommitments(filePath: string): Promise<BlobCommitments> {
    const wslPath = toWslPath(filePath);
    const outputPath = "/tmp/forsety-commitment-output.json";
    this.exec(["commitment", wslPath, outputPath]);

    try {
      const catResult = execFileSync("wsl", ["-e", "cat", outputPath], {
        encoding: "utf-8",
        timeout: 30_000,
      }).trim();
      const parsed = JSON.parse(catResult);
      return {
        commitments: parsed.commitments ?? [],
        hash: parsed.hash ?? this.computeFileHash(filePath),
      };
    } catch {
      return {
        commitments: [],
        hash: this.computeFileHash(filePath),
      };
    }
  }

  /**
   * Check Shelby CLI health.
   * CLI: shelby --version, shelby context list
   */
  async checkHealth(): Promise<{
    cliVersion: string;
    context: string;
    connected: boolean;
  }> {
    try {
      const version = this.exec(["--version"]);
      const contextOutput = this.exec(["context", "list"]);
      const hasContext = contextOutput
        .toLowerCase()
        .includes(this.config.network);

      return {
        cliVersion: version,
        context: this.config.network,
        connected: hasContext,
      };
    } catch {
      return {
        cliVersion: "unknown",
        context: this.config.network,
        connected: false,
      };
    }
  }

  /**
   * Get account balance.
   * CLI: shelby account balance [address]
   */
  async getBalance(): Promise<{ apt: string; shelbyUsd: string }> {
    const output = this.exec(["account", "balance"]);
    const aptMatch = output.match(/APT[:\s]+([\d.]+)/i);
    const usdMatch = output.match(/ShelbyUSD[:\s]+([\d.]+)/i);
    return {
      apt: aptMatch?.[1] ?? "0",
      shelbyUsd: usdMatch?.[1] ?? "0",
    };
  }

  computeFileHash(filePath: string): string {
    assertSafePath(filePath);
    try {
      const buffer = readFileSync(filePath);
      return createHash("sha256").update(buffer).digest("hex");
    } catch {
      try {
        const result = execFileSync(
          "wsl", ["-e", "sha256sum", toWslPath(filePath)],
          { encoding: "utf-8", timeout: 30_000 }
        ).trim();
        return result.split(/\s+/)[0] ?? "";
      } catch {
        return "";
      }
    }
  }
}
