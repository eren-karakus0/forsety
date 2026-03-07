import type { Agent } from "@forsety/db";

export interface McpContext {
  agent: Agent;
  startTime: number;
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export const PERMISSIONS = {
  "forsety_memory_store": "memory.write",
  "forsety_memory_retrieve": "memory.read",
  "forsety_memory_search": "memory.read",
  "forsety_memory_delete": "memory.write",
  "forsety_dataset_access": "dataset.read",
  "forsety_policy_check": "policy.read",
} as const;

export type ToolName = keyof typeof PERMISSIONS;
