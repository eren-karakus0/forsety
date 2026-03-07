import { z } from "zod";
import type { VectorSearchService } from "@forsety/sdk";
import type { McpContext, ToolResult } from "../types.js";

export const semanticSearchSchema = z.object({
  query: z.string().min(1).describe("The natural language search query"),
  type: z.enum(["dataset", "memory"]).describe("Type of resource to search"),
  limit: z.number().int().positive().max(50).optional().default(10),
});

export async function semanticSearch(
  args: z.infer<typeof semanticSearchSchema>,
  ctx: McpContext,
  vectorSearch: VectorSearchService
): Promise<ToolResult> {
  if (args.type === "dataset") {
    const results = await vectorSearch.searchDatasets(args.query, args.limit);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            type: "dataset",
            query: args.query,
            results: results.map((r) => ({
              id: r.item.id,
              name: r.item.name,
              description: r.item.description,
              score: r.score,
            })),
            total: results.length,
          }),
        },
      ],
    };
  }

  // Memory search — scoped to authenticated agent
  const results = await vectorSearch.searchMemories(
    ctx.agent.id,
    args.query,
    args.limit
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          type: "memory",
          query: args.query,
          results: results.map((r) => ({
            id: r.item.id,
            key: r.item.key,
            namespace: r.item.namespace,
            score: r.score,
          })),
          total: results.length,
        }),
      },
    ],
  };
}
