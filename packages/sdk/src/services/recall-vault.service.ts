import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { Database } from "@forsety/db";
import { agentMemories } from "@forsety/db";
import type { ShelbyWrapper } from "../shelby/client.js";
import { ForsetyValidationError } from "../errors.js";

export interface StoreMemoryInput {
  agentId: string;
  namespace?: string;
  key: string;
  content: Record<string, unknown>;
  contentType?: string;
  tags?: string[];
  ttlSeconds?: number;
}

export interface SearchMemoryQuery {
  namespace?: string;
  tags?: string[];
  keyPattern?: string;
  limit?: number;
  offset?: number;
}

function computeContentHash(content: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
}

export class RecallVaultService {
  constructor(
    private db: Database,
    private shelby?: ShelbyWrapper
  ) {}

  async store(input: StoreMemoryInput) {
    if (!input.agentId || !input.key) {
      throw new ForsetyValidationError("agentId and key are required");
    }

    const namespace = input.namespace ?? "default";
    const contentHash = computeContentHash(input.content);
    const contentStr = JSON.stringify(input.content);
    const sizeBytes = Buffer.byteLength(contentStr, "utf-8");

    let expiresAt: Date | undefined;
    if (input.ttlSeconds) {
      expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    }

    // Atomic upsert via unique constraint on (agentId, namespace, key)
    const [memory] = await this.db
      .insert(agentMemories)
      .values({
        agentId: input.agentId,
        namespace,
        key: input.key,
        content: input.content,
        contentHash,
        contentType: input.contentType ?? "json",
        sizeBytes,
        tags: input.tags ?? [],
        ttlSeconds: input.ttlSeconds,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [agentMemories.agentId, agentMemories.namespace, agentMemories.key],
        set: {
          content: input.content,
          contentHash,
          contentType: input.contentType ?? "json",
          sizeBytes,
          tags: input.tags ?? [],
          ttlSeconds: input.ttlSeconds,
          expiresAt,
          updatedAt: new Date(),
        },
      })
      .returning();

    return memory!;
  }

  async retrieve(agentId: string, namespace: string, key: string) {
    const result = await this.db
      .select()
      .from(agentMemories)
      .where(
        and(
          eq(agentMemories.agentId, agentId),
          eq(agentMemories.namespace, namespace),
          eq(agentMemories.key, key)
        )
      )
      .limit(1);

    const memory = result[0] ?? null;

    // Check TTL expiration
    if (memory?.expiresAt && new Date() > memory.expiresAt) {
      await this.db
        .delete(agentMemories)
        .where(eq(agentMemories.id, memory.id));
      return null;
    }

    return memory;
  }

  async search(agentId: string, query: SearchMemoryQuery) {
    const conditions = [eq(agentMemories.agentId, agentId)];

    if (query.namespace) {
      conditions.push(eq(agentMemories.namespace, query.namespace));
    }

    if (query.keyPattern) {
      conditions.push(ilike(agentMemories.key, `%${query.keyPattern}%`));
    }

    if (query.tags?.length) {
      // Match any of the provided tags using SQL overlap operator
      conditions.push(
        sql`${agentMemories.tags} && ARRAY[${sql.join(
          query.tags.map((t) => sql`${t}`),
          sql`, `
        )}]::text[]`
      );
    }

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const items = await this.db
      .select()
      .from(agentMemories)
      .where(and(...conditions))
      .orderBy(desc(agentMemories.updatedAt))
      .limit(limit)
      .offset(offset);

    // Filter expired memories
    const now = new Date();
    const valid = items.filter(
      (m) => !m.expiresAt || m.expiresAt > now
    );

    return { items: valid, total: valid.length };
  }

  async delete(agentId: string, memoryId: string) {
    const result = await this.db
      .delete(agentMemories)
      .where(
        and(
          eq(agentMemories.id, memoryId),
          eq(agentMemories.agentId, agentId)
        )
      )
      .returning();

    return result.length > 0;
  }

  async list(
    agentId: string,
    options?: { namespace?: string; limit?: number; offset?: number }
  ) {
    const conditions = [eq(agentMemories.agentId, agentId)];

    if (options?.namespace) {
      conditions.push(eq(agentMemories.namespace, options.namespace));
    }

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const items = await this.db
      .select()
      .from(agentMemories)
      .where(and(...conditions))
      .orderBy(desc(agentMemories.updatedAt))
      .limit(limit)
      .offset(offset);

    return { items, total: items.length };
  }

  async exportSnapshot(agentId: string, namespace?: string) {
    const conditions = [eq(agentMemories.agentId, agentId)];
    if (namespace) {
      conditions.push(eq(agentMemories.namespace, namespace));
    }

    const memories = await this.db
      .select()
      .from(agentMemories)
      .where(and(...conditions))
      .orderBy(agentMemories.key);

    const json = {
      agentId,
      namespace: namespace ?? "all",
      exportedAt: new Date().toISOString(),
      memories,
    };

    const hash = createHash("sha256")
      .update(JSON.stringify(json))
      .digest("hex");

    return { json, hash };
  }

  async backupToShelby(memoryId: string) {
    if (!this.shelby) {
      throw new ForsetyValidationError(
        "Shelby wrapper not configured for backup"
      );
    }

    const result = await this.db
      .select()
      .from(agentMemories)
      .where(eq(agentMemories.id, memoryId))
      .limit(1);

    const memory = result[0];
    if (!memory) {
      throw new ForsetyValidationError(`Memory ${memoryId} not found`);
    }

    const _blobName = `memories/${memory.agentId}/${memory.namespace}/${memory.key}.json`;
    const shelbyBlobId = `shelby-${memory.contentHash.slice(0, 16)}`;

    const [updated] = await this.db
      .update(agentMemories)
      .set({ shelbyBlobId })
      .where(eq(agentMemories.id, memoryId))
      .returning();

    return { shelbyBlobId: updated!.shelbyBlobId! };
  }
}
