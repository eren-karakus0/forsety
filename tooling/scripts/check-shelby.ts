import { execFileSync } from "node:child_process";

/**
 * Shelby CLI Health Check — matches real CLI contract (v0.0.26).
 *
 * CLI contract:
 *   upload   [source] [destination] -e <expiration> [--assume-yes]
 *   download [source] [destination] [-f]
 *   delete   [destination] [--assume-yes]
 *   account blobs [-a <account-name>]
 *   account balance [address]
 *   context list
 *   --version
 */

function shellQuote(arg: string): string {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

function exec(args: string[]): string {
  try {
    const cmd = ["shelby", ...args].map(shellQuote).join(" ");
    return execFileSync("wsl", ["-e", "bash", "-lc", cmd], {
      encoding: "utf-8",
      timeout: 60_000,
    }).trim();
  } catch (error) {
    throw new Error(
      `Shelby CLI error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function wslExec(args: string[]): string {
  return execFileSync("wsl", ["-e", ...args], {
    encoding: "utf-8",
    timeout: 30_000,
  }).trim();
}

function check(label: string, fn: () => string | void): boolean {
  try {
    const result = fn();
    console.log(`  ✓ ${label}${result ? ` — ${result}` : ""}`);
    return true;
  } catch (error) {
    console.error(
      `  ✗ ${label} — ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

function clearStaleLocks(): void {
  const lockPaths = [
    "$HOME/.shelby/download.lock",
    "$HOME/.shelby/upload.lock",
  ];
  for (const lockExpr of lockPaths) {
    try {
      const resolved = wslExec(["bash", "-c", `echo ${lockExpr}`]);
      // Check if lock file exists
      const exists = wslExec([
        "bash", "-c",
        `[ -f '${resolved}' ] && echo yes || echo no`,
      ]);
      if (exists !== "yes") continue;

      // Check if the PID that holds the lock is still alive
      const pidCheck = wslExec([
        "bash", "-c",
        `pid=$(grep -oP '"pid"\\s*:\\s*\\K[0-9]+' '${resolved}' 2>/dev/null || echo ""); [ -n "$pid" ] && kill -0 $pid 2>/dev/null && echo alive || echo stale`,
      ]);

      if (pidCheck === "stale") {
        wslExec(["rm", "-f", resolved]);
        console.log(`  ⚠ Removed stale lock: ${resolved} (holder PID not running)`);
      }
    } catch { /* lock path doesn't exist or stat failed — fine */ }
  }
}

function pickDownloadBlob(blobListOutput: string | null): string {
  // Try to find a text/json blob from the account blobs output
  if (blobListOutput) {
    const lines = blobListOutput.split("\n").filter((l) => l.trim().length > 0);
    const candidates: string[] = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      for (const part of parts) {
        if (part.includes("/") && !part.startsWith("http")) {
          candidates.push(part);
        }
      }
    }
    // Prefer text/json files for content verification
    const textBlob = candidates.find((b) => b.endsWith(".txt") || b.endsWith(".json"));
    if (textBlob) return textBlob;
    if (candidates.length > 0) return candidates[0]!;
  }

  // Fallback to known blob
  return "files/hello-shelby.txt";
}

async function main() {
  console.log("\n🔍 Forsety — Shelby Health Check\n");
  let allPassed = true;

  // 0. Clear stale lock files
  check("Stale lock cleanup", () => {
    clearStaleLocks();
  });

  // 1. CLI version
  const versionOk = check("Shelby CLI installed", () => {
    return exec(["--version"]);
  });
  if (!versionOk) allPassed = false;

  // 2. Context check
  const contextOk = check("Shelbynet context active", () => {
    const output = exec(["context", "list"]);
    if (!output.toLowerCase().includes("shelbynet")) {
      throw new Error("shelbynet context not found");
    }
  });
  if (!contextOk) allPassed = false;

  // 3. Account balance
  const balanceOk = check("Account balance", () => {
    const output = exec(["account", "balance"]);
    return output.replace(/\n/g, " | ");
  });
  if (!balanceOk) allPassed = false;

  // 4. Blob list (non-blocking — API can fail independently)
  let blobListOutput: string | null = null;
  const blobsOk = check("Account blobs accessible", () => {
    const output = exec(["account", "blobs"]);
    if (output.includes("fetch failed") || output.includes("Error")) {
      blobListOutput = null;
      throw new Error("Shelby blob list API returned an error");
    }
    blobListOutput = output;
    const lines = output.split("\n").filter((l) => l.trim().length > 0);
    return `${lines.length} lines returned`;
  });
  if (!blobsOk) allPassed = false;

  // 5. Download test (dynamic blob selection with fallback)
  const downloadFile = "/tmp/forsety-health-download.txt";
  const downloadBlob = pickDownloadBlob(blobListOutput);

  const downloadOk = check(`Download blob (${downloadBlob})`, () => {
    exec(["download", downloadBlob, downloadFile, "-f"]);
    // Verify file exists and has content (works for both text and binary)
    const size = wslExec(["bash", "-c", `stat -c %s '${downloadFile}'`]);
    const sizeNum = parseInt(size, 10);
    if (!sizeNum || sizeNum === 0) {
      throw new Error("Downloaded file is empty");
    }
    return `${sizeNum} bytes`;
  });
  if (!downloadOk) allPassed = false;

  // 6. Upload round-trip test
  // CLI: shelby upload [source] [destination] -e <expiration>
  const testBlobName = `forsety/health-check-${Date.now()}`;
  const testFile = "/tmp/forsety-health-test.txt";

  const uploadOk = check("Upload round-trip", () => {
    const testContent = `forsety-health-check-${Date.now()}`;
    wslExec(["bash", "-c", `echo '${testContent}' > ${testFile}`]);

    try {
      exec(["upload", testFile, testBlobName, "-e", "tomorrow", "--assume-yes"]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("status: 500") || msg.includes("Internal Server Error")) {
        throw new Error("Shelby server returned 500 — gate FAILED (server-side issue)");
      }
      throw error;
    }

    return "upload successful";
  });
  if (!uploadOk) allPassed = false;

  // 7. Cleanup
  check("Cleanup test artifacts", () => {
    try {
      exec(["delete", testBlobName, "--assume-yes"]);
    } catch { /* blob may not exist */ }
    try {
      wslExec(["rm", "-f", testFile, downloadFile]);
    } catch { /* ignore */ }
    return "cleaned up";
  });

  console.log();

  if (allPassed) {
    console.log("✅ All checks passed — Shelby connection is healthy\n");
    process.exit(0);
  } else {
    console.error("❌ Some checks failed — see above for details\n");
    process.exit(1);
  }
}

main();
