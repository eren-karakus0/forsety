import { z } from "zod";
import type { ForsetyClient } from "@forsety/sdk";
import type { McpContext, ToolResult } from "../types.js";

export const datasetAccessSchema = z.object({
  datasetId: z.string().uuid(),
  operationType: z.enum(["read", "download", "verify"]),
});

export async function datasetAccess(
  args: z.infer<typeof datasetAccessSchema>,
  ctx: McpContext,
  client: ForsetyClient
): Promise<ToolResult> {
  const dataset = await client.datasets.getById(args.datasetId);
  if (!dataset) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "Dataset not found" }),
        },
      ],
      isError: true,
    };
  }

  const accessLog = await client.access.logAccess({
    datasetId: args.datasetId,
    accessorAddress: ctx.agent.ownerAddress,
    operationType: args.operationType,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          accessLog: {
            id: accessLog.id,
            operationType: accessLog.operationType,
            readProof: accessLog.readProof,
            timestamp: accessLog.timestamp,
          },
          dataset: {
            id: dataset.id,
            name: dataset.name,
            blobHash: dataset.blobHash,
          },
        }),
      },
    ],
  };
}
