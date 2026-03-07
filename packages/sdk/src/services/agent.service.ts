import { eq } from "drizzle-orm";
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
