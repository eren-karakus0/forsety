import { eq, count } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import type { Database } from "@forsety/db";
import { agents } from "@forsety/db";
import { ForsetyValidationError } from "../errors.js";

export interface RegisterAgentInput {
  name: string;
  description?: string;
  ownerAddress: string;
  permissions?: string[];
  allowedDatasets?: string[];
  metadata?: Record<string, unknown>;
}

function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

function generateApiKey(): string {
  return `fsy_${randomBytes(32).toString("hex")}`;
}

/** Strip agentApiKey hash from agent before sending to client */
export function sanitizeAgent<T extends { agentApiKey?: unknown }>(
  agent: T
): Omit<T, "agentApiKey"> {
  const { agentApiKey: _, ...safe } = agent;
  return safe;
}

export class AgentService {
  constructor(private db: Database) {}

  async register(input: RegisterAgentInput) {
    if (!input.name || !input.ownerAddress) {
      throw new ForsetyValidationError("name and ownerAddress are required");
    }

    const plainApiKey = generateApiKey();
    const hashedKey = hashApiKey(plainApiKey);

    const [agent] = await this.db
      .insert(agents)
      .values({
        name: input.name,
        description: input.description,
        agentApiKey: hashedKey,
        ownerAddress: input.ownerAddress,
        permissions: input.permissions ?? [
          "memory.read",
          "memory.write",
          "dataset.read",
          "policy.read",
        ],
        allowedDatasets: input.allowedDatasets ?? ["*"],
        metadata: input.metadata,
      })
      .returning();

    return { agent: agent!, apiKey: plainApiKey };
  }

  async authenticate(apiKey: string) {
    if (!apiKey) return null;

    const hashedKey = hashApiKey(apiKey);
    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.agentApiKey, hashedKey))
      .limit(1);

    const agent = result[0];
    if (!agent || !agent.isActive) return null;

    return agent;
  }

  /** Efficient COUNT of agents owned by address. */
  async countByOwner(ownerAddress: string): Promise<number> {
    const [result] = await this.db
      .select({ total: count() })
      .from(agents)
      .where(eq(agents.ownerAddress, ownerAddress));
    return result?.total ?? 0;
  }

  async listByOwner(ownerAddress: string) {
    return this.db
      .select()
      .from(agents)
      .where(eq(agents.ownerAddress, ownerAddress));
  }

  async getById(id: string) {
    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  /** @internal — unscoped, use listByOwner() for tenant-isolated access. */
  async list() {
    return this.db.select().from(agents);
  }

  async updatePermissions(
    id: string,
    permissions: string[],
    allowedDatasets?: string[]
  ) {
    const values: Partial<typeof agents.$inferInsert> = { permissions };
    if (allowedDatasets) {
      values.allowedDatasets = allowedDatasets;
    }

    const [updated] = await this.db
      .update(agents)
      .set(values)
      .where(eq(agents.id, id))
      .returning();

    return updated ?? null;
  }

  async rotateApiKey(id: string): Promise<{ apiKey: string } | null> {
    const agent = await this.getById(id);
    if (!agent) return null;
    if (!agent.isActive) {
      throw new ForsetyValidationError(
        "Cannot rotate key for inactive agent"
      );
    }

    const newApiKey = generateApiKey();
    const hashedKey = hashApiKey(newApiKey);
    await this.db
      .update(agents)
      .set({ agentApiKey: hashedKey })
      .where(eq(agents.id, id));

    return { apiKey: newApiKey };
  }

  async deactivate(id: string) {
    await this.db
      .update(agents)
      .set({ isActive: false })
      .where(eq(agents.id, id));
  }

  async touchLastSeen(id: string) {
    await this.db
      .update(agents)
      .set({ lastSeenAt: new Date() })
      .where(eq(agents.id, id));
  }
}
