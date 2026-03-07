import { z } from "zod";
import type { RecallVaultService } from "@forsety/sdk";
import type { McpContext, ToolResult } from "../types.js";

export const memoryDeleteSchema = z.object({
  namespace: z.string().default("default"),
  key: z.string().min(1),
});

export async function memoryDelete(
  args: z.infer<typeof memoryDeleteSchema>,
  ctx: McpContext,
  recallVault: RecallVaultService
): Promise<ToolResult> {
  // First retrieve to get the memory ID
  const memory = await recallVault.retrieve(
    ctx.agent.id,
    args.namespace,
    args.key
  );

  if (!memory) {
    return {
      content: [{ type: "text", text: JSON.stringify({ deleted: false }) }],
    };
  }

  const deleted = await recallVault.delete(ctx.agent.id, memory.id);

  return {
    content: [{ type: "text", text: JSON.stringify({ deleted }) }],
  };
}
