import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from "@forsety/ui";

const codeSnippets = {
  sdk: `import { ForsetyClient } from "@forsety/sdk";

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

  mcp: `// MCP tool call from an AI agent
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

  api: `# Log dataset access with policy enforcement
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
};

export function ForDevelopers() {
  return (
    <section
      id="developers"
      className="border-t border-navy-100 bg-white py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-600">
            For Developers
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy-900 sm:text-4xl">
            Integrate in Minutes
          </h2>
          <p className="mt-4 text-lg text-navy-500">
            TypeScript SDK, MCP tools, and REST API — pick the integration that
            fits your stack.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <Card className="overflow-hidden border-navy-200">
            <CardContent className="p-0">
              <Tabs defaultValue="sdk">
                <div className="border-b border-navy-100 bg-navy-50/50 px-4 pt-3">
                  <TabsList className="bg-transparent">
                    <TabsTrigger
                      value="sdk"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      SDK
                    </TabsTrigger>
                    <TabsTrigger
                      value="mcp"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      MCP
                    </TabsTrigger>
                    <TabsTrigger
                      value="api"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      REST API
                    </TabsTrigger>
                  </TabsList>
                </div>

                {Object.entries(codeSnippets).map(([key, code]) => (
                  <TabsContent key={key} value={key} className="mt-0">
                    <pre className="overflow-x-auto bg-navy-950 p-6 text-sm leading-relaxed">
                      <code className="font-mono text-navy-200">{code}</code>
                    </pre>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
