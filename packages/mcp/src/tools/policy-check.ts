import { z } from "zod";
import type { ForsetyClient } from "@forsety/sdk";
import type { McpContext, ToolResult } from "../types.js";

export const policyCheckSchema = z.object({
  datasetId: z.string().uuid(),
});

export async function policyCheck(
  args: z.infer<typeof policyCheckSchema>,
  ctx: McpContext,
  client: ForsetyClient
): Promise<ToolResult> {
  const { allowed, policy } = await client.policies.checkAccess(
    args.datasetId,
    ctx.agent.ownerAddress
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          allowed,
          reason: allowed
            ? "Access permitted by policy"
            : policy
              ? "Access denied by policy"
              : "No policy found for dataset",
          policy: policy
            ? {
                id: policy.id,
                version: policy.version,
                allowedAccessors: policy.allowedAccessors,
                maxReads: policy.maxReads,
                readsConsumed: policy.readsConsumed,
                expiresAt: policy.expiresAt,
              }
            : null,
        }),
      },
    ],
  };
}
