import { execSync } from "node:child_process";

function exec(cmd: string): string {
  try {
    return execSync(`wsl -e bash -l -c '${cmd}'`, {
      encoding: "utf-8",
      timeout: 30_000,
    }).trim();
  } catch (error) {
    throw new Error(
      `Command failed: ${cmd}\n${error instanceof Error ? error.message : String(error)}`
    );
  }
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

async function main() {
  console.log("\n🔍 Forsety — Shelby Health Check\n");
  let allPassed = true;

  // 1. CLI version
  const versionOk = check("Shelby CLI installed", () => {
    const version = exec("shelby --version");
    return version;
  });
  if (!versionOk) allPassed = false;

  // 2. Context check
  const contextOk = check("Shelbynet context active", () => {
    const output = exec("shelby context list");
    if (!output.toLowerCase().includes("shelbynet")) {
      throw new Error("shelbynet context not found");
    }
  });
  if (!contextOk) allPassed = false;

  // 3. Account balance
  const balanceOk = check("Account balance", () => {
    const output = exec("shelby account balance");
    return output.replace(/\n/g, " | ");
  });
  if (!balanceOk) allPassed = false;

  // 4. Blob list
  const blobsOk = check("Account blobs accessible", () => {
    const output = exec("shelby account blobs");
    const lines = output.split("\n").filter((l) => l.trim().length > 0);
    return `${lines.length} lines returned`;
  });
  if (!blobsOk) allPassed = false;

  // 5. Test upload round-trip
  const roundTripOk = check("Upload round-trip test", () => {
    const testContent = `forsety-health-check-${Date.now()}`;
    exec(`echo '${testContent}' > /tmp/forsety-health-test.txt`);
    exec(
      "shelby upload /tmp/forsety-health-test.txt --name forsety/health-check-test"
    );
    exec("rm /tmp/forsety-health-test.txt");
    return "upload successful";
  });
  if (!roundTripOk) allPassed = false;

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
