import { z } from "zod";
import type { RecallVaultService } from "@forsety/sdk";
import type { McpContext, ToolResult } from "../types.js";

export const memoryStoreSchema = z.object({
  namespace: z.string().default("default"),
  key: z.string().min(1),
  content: z.record(z.unknown()),
  tags: z.array(z.string()).optional(),
  ttlSeconds: z.number().int().positive().optional(),
});

export async function memoryStore(
  args: z.infer<typeof memoryStoreSchema>,
  ctx: McpContext,
  recallVault: RecallVaultService
): Promise<ToolResult> {
  const memory = await recallVault.store({
    agentId: ctx.agent.id,
    namespace: args.namespace,
    key: args.key,
    content: args.content as Record<string, unknown>,
    tags: args.tags,
    ttlSeconds: args.ttlSeconds,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          memoryId: memory.id,
          contentHash: memory.contentHash,
          isNew: !memory.updatedAt || memory.createdAt.getTime() === memory.updatedAt.getTime(),
        }),
      },
    ],
  };
}
