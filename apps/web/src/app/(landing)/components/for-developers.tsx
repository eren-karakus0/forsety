"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forsety/ui";
import { Check, Copy } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";

const codeSnippets: Record<string, { code: string; lang: "ts" | "json" | "bash" }> = {
  sdk: {
    lang: "ts",
    code: `import { ForsetyClient } from "@forsety/sdk";

const forsety = new ForsetyClient({
  databaseUrl: process.env.DATABASE_URL,
  shelbyMode: "live",
});

// Upload dataset with license
const dataset = await forsety.datasets.upload({
  name: "training-data-v3",
  ownerAddress: "0xa9f0...",
  license: {
    spdxType: "Apache-2.0",
    grantorAddress: "0xa9f0...",
  },
});

// Generate evidence pack
const evidence = await forsety.evidence.generate(dataset.id);`,
  },
  mcp: {
    lang: "json",
    code: `// MCP tool call from an AI agent
{
  "tool": "forsety_memory_store",
  "arguments": {
    "namespace": "research",
    "key": "findings-march",
    "content": { "summary": "..." },
    "tags": ["research", "q1"],
    "ttlSeconds": 86400
  }
}

// Search memories semantically
{
  "tool": "forsety_semantic_search",
  "arguments": {
    "query": "research findings about compliance",
    "type": "memory",
    "limit": 5
  }
}`,
  },
  api: {
    lang: "bash",
    code: `# Log dataset access with policy enforcement
curl -X POST /api/access \\
  -H "X-API-Key: fsy_abc123..." \\
  -d '{
    "datasetId": "550e8400-...",
    "accessorAddress": "0xb2c3...",
    "operationType": "read"
  }'

# Generate evidence pack
curl /api/datasets/550e8400-.../evidence \\
  -H "X-API-Key: fsy_abc123..."

# Response: verifiable evidence bundle
# with licenses, policies, access logs,
# and cryptographic proofs`,
  },
};

// Lightweight regex-based syntax highlighting
function highlightCode(code: string, lang: "ts" | "json" | "bash"): React.ReactNode[] {
  const lines = code.split("\n");

  return lines.map((line, i) => {
    let highlighted: React.ReactNode;

    if (lang === "ts") {
      highlighted = highlightTS(line, i);
    } else if (lang === "json") {
      highlighted = highlightJSON(line, i);
    } else {
      highlighted = highlightBash(line, i);
    }

    return (
      <span key={i}>
        {highlighted}
        {i < lines.length - 1 ? "\n" : ""}
      </span>
    );
  });
}

function highlightTS(line: string, lineIdx: number): React.ReactNode {
  if (line.trimStart().startsWith("//")) {
    return <span className="text-white/30">{line}</span>;
  }

  const parts: React.ReactNode[] = [];
  const regex = /(import|from|const|await|process\.env\.\w+|"[^"]*")/g;
  let lastIndex = 0;
  let match;
  let partIdx = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${lineIdx}-t${partIdx++}`}>{line.slice(lastIndex, match.index)}</span>);
    }
    const token = match[0];
    if (token === "import" || token === "from" || token === "const" || token === "await") {
      parts.push(<span key={`${lineIdx}-t${partIdx++}`} className="text-violet-400">{token}</span>);
    } else if (token.startsWith('"')) {
      parts.push(<span key={`${lineIdx}-t${partIdx++}`} className="text-gold-400">{token}</span>);
    } else if (token.startsWith("process.env.")) {
      parts.push(<span key={`${lineIdx}-t${partIdx++}`} className="text-teal-400">{token}</span>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    parts.push(<span key={`${lineIdx}-t${partIdx}`}>{line.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? <>{parts}</> : line;
}

function highlightJSON(line: string, lineIdx: number): React.ReactNode {
  if (line.trimStart().startsWith("//")) {
    return <span className="text-white/30">{line}</span>;
  }

  const parts: React.ReactNode[] = [];
  const regex = /("[\w_-]+")\s*:/g;
  let lastIndex = 0;
  let match;
  let partIdx = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${lineIdx}-j${partIdx++}`}>{highlightJSONValues(line.slice(lastIndex, match.index), lineIdx, partIdx)}</span>);
    }
    parts.push(<span key={`${lineIdx}-j${partIdx++}`} className="text-teal-400">{match[1]}</span>);
    parts.push(<span key={`${lineIdx}-j${partIdx++}`}>:</span>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    parts.push(<span key={`${lineIdx}-j${partIdx}`}>{highlightJSONValues(line.slice(lastIndex), lineIdx, partIdx + 100)}</span>);
  }

  return parts.length > 0 ? <>{parts}</> : line;
}

function highlightJSONValues(text: string, lineIdx: number, baseIdx: number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /"[^"]*"|\b\d+\b/g;
  let lastIndex = 0;
  let match;
  let partIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${lineIdx}-v${baseIdx}-${partIdx++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    if (match[0].startsWith('"')) {
      parts.push(<span key={`${lineIdx}-v${baseIdx}-${partIdx++}`} className="text-gold-400">{match[0]}</span>);
    } else {
      parts.push(<span key={`${lineIdx}-v${baseIdx}-${partIdx++}`} className="text-violet-400">{match[0]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`${lineIdx}-v${baseIdx}-${partIdx}`}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

function highlightBash(line: string, lineIdx: number): React.ReactNode {
  if (line.trimStart().startsWith("#")) {
    return <span className="text-white/30">{line}</span>;
  }

  const parts: React.ReactNode[] = [];
  const regex = /(curl|-X|-H|-d|POST|GET|\\)|(".*?")|('.*?')/g;
  let lastIndex = 0;
  let match;
  let partIdx = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${lineIdx}-b${partIdx++}`}>{line.slice(lastIndex, match.index)}</span>);
    }
    const token = match[0];
    if (token === "curl") {
      parts.push(<span key={`${lineIdx}-b${partIdx++}`} className="text-violet-400">{token}</span>);
    } else if (token.startsWith('"') || token.startsWith("'")) {
      parts.push(<span key={`${lineIdx}-b${partIdx++}`} className="text-gold-400">{token}</span>);
    } else if (token === "-X" || token === "-H" || token === "-d") {
      parts.push(<span key={`${lineIdx}-b${partIdx++}`} className="text-teal-400">{token}</span>);
    } else {
      parts.push(<span key={`${lineIdx}-b${partIdx++}`} className="text-white/60">{token}</span>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    parts.push(<span key={`${lineIdx}-b${partIdx}`}>{line.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? <>{parts}</> : line;
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white/50 transition-all hover:bg-white/20 hover:text-white"
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

export function ForDevelopers() {
  return (
    <section
      id="developers"
      className="py-20 sm:py-28"
    >
      <div className="section-divider mx-auto max-w-5xl mb-20 sm:mb-28" />
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-400">
            For Developers
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
            Integrate in Minutes
          </h2>
          <p className="mt-4 text-lg text-navy-400">
            TypeScript SDK, MCP tools, and REST API — pick the integration that
            fits your stack.
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mx-auto mt-12 max-w-3xl">
            <div className="overflow-hidden rounded-2xl shadow-[0_0_60px_rgba(13,20,36,0.12)]">
              <Tabs defaultValue="sdk">
                <div className="border-b border-navy-800 bg-navy-900 px-4 pt-3">
                  <TabsList className="bg-transparent">
                    <TabsTrigger
                      value="sdk"
                      className="text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-gold-400 data-[state=active]:shadow-none"
                    >
                      SDK
                    </TabsTrigger>
                    <TabsTrigger
                      value="mcp"
                      className="text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-teal-400 data-[state=active]:shadow-none"
                    >
                      MCP
                    </TabsTrigger>
                    <TabsTrigger
                      value="api"
                      className="text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-violet-400 data-[state=active]:shadow-none"
                    >
                      REST API
                    </TabsTrigger>
                  </TabsList>
                </div>

                {Object.entries(codeSnippets).map(([key, { code, lang }]) => (
                  <TabsContent key={key} value={key} className="mt-0">
                    <div className="relative">
                      <CopyButton code={code} />
                      <pre className="overflow-x-auto bg-navy-900 p-6 pr-14 text-sm leading-relaxed">
                        <code className="font-mono text-white/70">
                          {highlightCode(code, lang)}
                        </code>
                      </pre>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
