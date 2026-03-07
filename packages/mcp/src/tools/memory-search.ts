import { z } from "zod";
import type { RecallVaultService } from "@forsety/sdk";
import type { McpContext, ToolResult } from "../types.js";

export const memorySearchSchema = z.object({
  namespace: z.string().optional(),
  tags: z.array(z.string()).optional(),
  keyPattern: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export async function memorySearch(
  args: z.infer<typeof memorySearchSchema>,
  ctx: McpContext,
  recallVault: RecallVaultService
): Promise<ToolResult> {
  const result = await recallVault.search(ctx.agent.id, {
    namespace: args.namespace,
    tags: args.tags,
    keyPattern: args.keyPattern,
    limit: args.limit,
    offset: args.offset,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          memories: result.items,
          total: result.total,
        }),
      },
    ],
  };
}
