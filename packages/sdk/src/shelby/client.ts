import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import type {
  ShelbyWrapperConfig,
  UploadResult,
  BlobMetadata,
  BlobCommitments,
} from "./types.js";
import { ForsetyUploadError, ForsetyError } from "../errors.js";

export class ShelbyWrapper {
  private config: ShelbyWrapperConfig;

  constructor(config: ShelbyWrapperConfig) {
    this.config = config;
  }

  private exec(command: string): string {
    try {
      const fullCommand = `wsl -e bash -l -c 'shelby ${command}'`;
      return execSync(fullCommand, {
        encoding: "utf-8",
        timeout: 60_000,
      }).trim();
    } catch (error) {
      throw new ForsetyError(
        `Shelby CLI error: ${error instanceof Error ? error.message : String(error)}`,
        "SHELBY_CLI_ERROR",
        error
      );
    }
  }

  async uploadDataset(
    filePath: string,
    blobName: string
  ): Promise<UploadResult> {
    try {
      const wslPath = filePath.replace(/\\/g, "/").replace(/^([A-Z]):/, (_m, d) => `/mnt/${d.toLowerCase()}`);
      const output = this.exec(
        `upload ${wslPath} --name ${blobName} --output-commitments /tmp/forsety-commitments.json`
      );

      const hash = this.computeFileHash(filePath);

      const blobIdMatch = output.match(/blob[_\s]?id[:\s]+(\S+)/i);
      const blobId = blobIdMatch?.[1] ?? blobName;

      return {
        blobId,
        blobName,
        hash,
        sizeBytes: 0,
      };
    } catch (error) {
      throw new ForsetyUploadError(
        `Failed to upload dataset: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  async downloadDataset(
    account: string,
    blobName: string,
    outputPath: string
  ): Promise<void> {
    const wslOutput = outputPath.replace(/\\/g, "/").replace(/^([A-Z]):/, (_m, d) => `/mnt/${d.toLowerCase()}`);
    this.exec(`download ${account} ${blobName} ${wslOutput}`);
  }

  async getAccountBlobs(account: string): Promise<BlobMetadata[]> {
    const output = this.exec(`account blobs --account ${account}`);
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

  async generateCommitments(filePath: string): Promise<BlobCommitments> {
    const wslPath = filePath.replace(/\\/g, "/").replace(/^([A-Z]):/, (_m, d) => `/mnt/${d.toLowerCase()}`);
    const outputPath = "/tmp/forsety-commitment-output.json";
    this.exec(`commitment ${wslPath} ${outputPath}`);

    const result = this.exec(`cat ${outputPath}`);
    try {
      const parsed = JSON.parse(result);
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

  async checkHealth(): Promise<{
    cliVersion: string;
    context: string;
    connected: boolean;
  }> {
    try {
      const version = this.exec("--version");
      const contextOutput = this.exec("context list");
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

  async getBalance(): Promise<{ apt: string; shelbyUsd: string }> {
    const output = this.exec("account balance");
    const aptMatch = output.match(/APT[:\s]+([\d.]+)/i);
    const usdMatch = output.match(/ShelbyUSD[:\s]+([\d.]+)/i);
    return {
      apt: aptMatch?.[1] ?? "0",
      shelbyUsd: usdMatch?.[1] ?? "0",
    };
  }

  private computeFileHash(filePath: string): string {
    const wslPath = filePath.replace(/\\/g, "/").replace(/^([A-Z]):/, (_m, d) => `/mnt/${d.toLowerCase()}`);
    try {
      const result = execSync(
        `wsl -e bash -l -c 'sha256sum ${wslPath}'`,
        { encoding: "utf-8", timeout: 30_000 }
      ).trim();
      return result.split(/\s+/)[0] ?? "";
    } catch {
      return createHash("sha256").update(filePath).digest("hex");
    }
  }
}
