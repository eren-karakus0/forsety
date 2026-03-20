import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ForsetyClient } from "@forsety/sdk";
import { AuthMiddleware } from "./middleware/auth.js";
import { PolicyCheckMiddleware } from "./middleware/policy-check.js";
import { AuditMiddleware } from "./middleware/audit.js";
import type { McpContext, ToolResult } from "./types.js";

import { memoryStoreSchema, memoryStore } from "./tools/memory-store.js";
import { memoryRetrieveSchema, memoryRetrieve } from "./tools/memory-retrieve.js";
import { memorySearchSchema, memorySearch } from "./tools/memory-search.js";
import { memoryDeleteSchema, memoryDelete } from "./tools/memory-delete.js";
import { datasetAccessSchema, datasetAccess } from "./tools/dataset-access.js";
import { policyCheckSchema, policyCheck } from "./tools/policy-check.js";
import { semanticSearchSchema, semanticSearch } from "./tools/semantic-search.js";

export interface ForsetyMcpServerConfig {
  databaseUrl: string;
  shelbyMode?: "live" | "mock";
  shelbyWalletAddress?: string;
  hmacSecret: string;
}

/** Extract API key from MCP tool extra metadata. */
function extractApiKey(extra: unknown): string {
  return ((extra as Record<string, unknown>)?._meta as Record<string, unknown>)?.apiKey as string ?? "";
}

export function createForsetyMcpServer(
  config: ForsetyMcpServerConfig,
  existingClient?: ForsetyClient
) {
  const client = existingClient ?? new ForsetyClient({
    databaseUrl: config.databaseUrl,
    shelbyMode: config.shelbyMode ?? "mock",
    shelbyWalletAddress: config.shelbyWalletAddress,
    hmacSecret: config.hmacSecret,
  });

  const authMiddleware = new AuthMiddleware(client.agents);
  const policyCheckMiddleware = new PolicyCheckMiddleware();
  const auditMiddleware = new AuditMiddleware(client.agentAudit);

  const server = new McpServer({
    name: "forsety-recallvault",
    version: "0.2.0",
  });

  // Helper: wrap tool execution with auth → policy → audit pipeline
  async function executeWithPipeline(
    toolName: string,
    args: Record<string, unknown>,
    apiKey: string,
    handler: (ctx: McpContext) => Promise<ToolResult>,
    resourceType?: string,
    resourceId?: string
  ): Promise<ToolResult> {
    const startTime = Date.now();

    // Auth
    const agent = await authMiddleware.authenticate(apiKey);
    if (!agent) {
      await auditMiddleware.logToolCall({
        agentId: null,
        toolName,
        input: args,
        output: { error: "Authentication failed" },
        status: "denied",
        errorMessage: "Invalid or missing API key",
        durationMs: Date.now() - startTime,
      }).catch(() => {});

      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Authentication failed" }) }],
        isError: true,
      };
    }

    // Policy check
    const permCheck = policyCheckMiddleware.checkPermission(agent, toolName);
    if (!permCheck.allowed) {
      await auditMiddleware.logToolCall({
        agentId: agent.id,
        toolName,
        input: args,
        output: { error: permCheck.reason },
        status: "denied",
        errorMessage: permCheck.reason,
        durationMs: Date.now() - startTime,
        resourceType,
        resourceId,
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ error: permCheck.reason }) }],
        isError: true,
      };
    }

    // Execute
    try {
      const ctx: McpContext = { agent, startTime };
      const result = await handler(ctx);

      await auditMiddleware.logToolCall({
        agentId: agent.id,
        toolName,
        input: args,
        output: JSON.parse(result.content[0]?.text ?? "{}"),
        status: "success",
        durationMs: Date.now() - startTime,
        resourceType,
        resourceId,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await auditMiddleware.logToolCall({
        agentId: agent.id,
        toolName,
        input: args,
        output: { error: errorMessage },
        status: "error",
        errorMessage,
        durationMs: Date.now() - startTime,
        resourceType,
        resourceId,
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ error: errorMessage }) }],
        isError: true,
      };
    }
  }

  // Helper: register a tool with the standard auth → policy → audit pipeline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function registerTool<T, S = any>(
    name: string,
    description: string,
    schema: { shape: Record<string, unknown> },
    handler: (args: T, ctx: McpContext, service: S) => Promise<ToolResult>,
    service: S,
    resourceType?: string
  ) {
    server.tool(name, description, schema.shape, async (args, extra) => {
      const apiKey = extractApiKey(extra);
      return executeWithPipeline(
        name,
        args as Record<string, unknown>,
        apiKey,
        (ctx) => handler(args as T, ctx, service),
        resourceType
      );
    });
  }

  // Register tools
  registerTool("forsety_memory_store", "Store a memory in RecallVault. Upserts by namespace+key.", memoryStoreSchema, memoryStore, client.recallVault, "memory");
  registerTool("forsety_memory_retrieve", "Retrieve a specific memory by namespace and key.", memoryRetrieveSchema, memoryRetrieve, client.recallVault, "memory");
  registerTool("forsety_memory_search", "Search memories by namespace, tags, or key pattern.", memorySearchSchema, memorySearch, client.recallVault, "memory");
  registerTool("forsety_memory_delete", "Delete a memory by namespace and key.", memoryDeleteSchema, memoryDelete, client.recallVault, "memory");

  server.tool(
    "forsety_dataset_access",
    "Access a dataset and log the access with a cryptographic proof.",
    datasetAccessSchema.shape,
    async (args, extra) => {
      const scopeCheckStart = Date.now();
      const apiKey = extractApiKey(extra);
      // Dataset scope check
      const agent = await authMiddleware.authenticate(apiKey);
      if (agent) {
        const dsCheck = policyCheckMiddleware.checkDatasetAccess(agent, args.datasetId);
        if (!dsCheck.allowed) {
          await auditMiddleware.logToolCall({
            agentId: agent.id,
            toolName: "forsety_dataset_access",
            input: args as Record<string, unknown>,
            output: { error: dsCheck.reason },
            status: "denied",
            errorMessage: dsCheck.reason,
            durationMs: Date.now() - scopeCheckStart,
            resourceType: "dataset",
            resourceId: args.datasetId,
          }).catch(() => {});

          return {
            content: [{ type: "text", text: JSON.stringify({ error: dsCheck.reason }) }],
            isError: true,
          };
        }
      }

      return executeWithPipeline(
        "forsety_dataset_access",
        args as Record<string, unknown>,
        apiKey,
        (ctx) => datasetAccess(args, ctx, client),
        "dataset",
        args.datasetId
      );
    }
  );

  server.tool(
    "forsety_policy_check",
    "Check if the agent has policy access to a dataset.",
    policyCheckSchema.shape,
    async (args, extra) => {
      const scopeCheckStart = Date.now();
      const apiKey = extractApiKey(extra);

      // Dataset scope check (same as forsety_dataset_access)
      const agent = await authMiddleware.authenticate(apiKey);
      if (agent) {
        const dsCheck = policyCheckMiddleware.checkDatasetAccess(agent, args.datasetId);
        if (!dsCheck.allowed) {
          await auditMiddleware.logToolCall({
            agentId: agent.id,
            toolName: "forsety_policy_check",
            input: args as Record<string, unknown>,
            output: { error: dsCheck.reason },
            status: "denied",
            errorMessage: dsCheck.reason,
            durationMs: Date.now() - scopeCheckStart,
            resourceType: "policy",
            resourceId: args.datasetId,
          }).catch(() => {});

          return {
            content: [{ type: "text", text: JSON.stringify({ error: dsCheck.reason }) }],
            isError: true,
          };
        }
      }

      return executeWithPipeline(
        "forsety_policy_check",
        args as Record<string, unknown>,
        apiKey,
        (ctx) => policyCheck(args, ctx, client),
        "policy",
        args.datasetId
      );
    }
  );

  registerTool("forsety_semantic_search", "Search datasets or agent memories using natural language semantic similarity.", semanticSearchSchema, semanticSearch, client.vectorSearch, "memory");

  return { server, client };
}
