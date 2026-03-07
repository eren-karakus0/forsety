import { z } from "zod";
import type { RecallVaultService } from "@forsety/sdk";
import type { McpContext, ToolResult } from "../types.js";

export const memoryRetrieveSchema = z.object({
  namespace: z.string().default("default"),
  key: z.string().min(1),
});

export async function memoryRetrieve(
  args: z.infer<typeof memoryRetrieveSchema>,
  ctx: McpContext,
  recallVault: RecallVaultService
): Promise<ToolResult> {
  const memory = await recallVault.retrieve(
    ctx.agent.id,
    args.namespace,
    args.key
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(memory),
      },
    ],
  };
}
