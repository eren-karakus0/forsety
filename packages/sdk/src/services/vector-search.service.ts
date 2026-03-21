import { eq, and, sql } from "drizzle-orm";
import type { Database } from "@forsety/db";
import { embeddings, datasets, agentMemories } from "@forsety/db";
import type { Embedder } from "../embeddings/local-embedder.js";
import { ForsetyValidationError } from "../errors.js";

export interface ScoredResult<T> {
  item: T;
  score: number;
  textContent: string;
}

export class VectorSearchService {
  constructor(
    private db: Database,
    private embedder: Embedder
  ) {}

  async embedDataset(datasetId: string): Promise<void> {
    const result = await this.db
      .select()
      .from(datasets)
      .where(eq(datasets.id, datasetId))
      .limit(1);

    const dataset = result[0];
    if (!dataset) {
      throw new ForsetyValidationError(`Dataset ${datasetId} not found`);
    }

    const textContent = [dataset.name, dataset.description]
      .filter(Boolean)
      .join(" ");

    if (!textContent.trim()) {
      throw new ForsetyValidationError("Dataset has no text content to embed");
    }

    const vector = await this.embedder.embed(textContent);

    await this.db
      .insert(embeddings)
      .values({
        sourceType: "dataset",
        sourceId: datasetId,
        embedding: vector,
        textContent,
      })
      .onConflictDoUpdate({
        target: [embeddings.sourceType, embeddings.sourceId],
        set: {
          embedding: vector,
          textContent,
          createdAt: new Date(),
        },
      });
  }

  async embedMemory(memoryId: string): Promise<void> {
    const result = await this.db
      .select()
      .from(agentMemories)
      .where(eq(agentMemories.id, memoryId))
      .limit(1);

    const memory = result[0];
    if (!memory) {
      throw new ForsetyValidationError(`Memory ${memoryId} not found`);
    }

    const textContent = [memory.key, JSON.stringify(memory.content)]
      .filter(Boolean)
      .join(" ");

    const vector = await this.embedder.embed(textContent);

    await this.db
      .insert(embeddings)
      .values({
        sourceType: "memory",
        sourceId: memoryId,
        embedding: vector,
        textContent,
      })
      .onConflictDoUpdate({
        target: [embeddings.sourceType, embeddings.sourceId],
        set: {
          embedding: vector,
          textContent,
          createdAt: new Date(),
        },
      });
  }

  async searchDatasets(
    query: string,
    limit: number = 10,
    ownerAddress?: string,
    datasetIds?: string[]
  ): Promise<ScoredResult<{ id: string; name: string; description: string | null; ownerAddress: string }>[]> {
    if (!query.trim()) return [];

    const queryVector = await this.embedder.embed(query);
    const vectorStr = `[${queryVector.join(",")}]`;

    const conditions = [sql`e.source_type = 'dataset'`];
    if (ownerAddress) {
      conditions.push(sql`d.owner_address = ${ownerAddress}`);
    }
    if (datasetIds && datasetIds.length > 0) {
      conditions.push(
        sql`d.id = ANY(ARRAY[${sql.join(datasetIds.map((id) => sql`${id}::uuid`), sql`, `)}])`
      );
    }

    const whereClause = sql.join(conditions, sql` AND `);

    const results = await this.db.execute(
      sql`SELECT e.source_id, e.text_content,
            1 - (e.embedding <=> ${vectorStr}::vector) as score
          FROM embeddings e
          JOIN datasets d ON d.id = e.source_id
          WHERE ${whereClause}
          ORDER BY e.embedding <=> ${vectorStr}::vector
          LIMIT ${limit}`
    );

    if (!results.rows?.length) return [];

    // Fetch dataset details for matched IDs
    const sourceIds = results.rows.map((r: Record<string, unknown>) => r.source_id as string);
    const datasetRows = await this.db
      .select()
      .from(datasets)
      .where(sql`${datasets.id} = ANY(ARRAY[${sql.join(sourceIds.map((id: string) => sql`${id}::uuid`), sql`, `)}])`);

    const datasetMap = new Map(datasetRows.map((d) => [d.id, d]));

    return results.rows
      .map((r: Record<string, unknown>) => {
        const dataset = datasetMap.get(r.source_id as string);
        if (!dataset) return null;
        return {
          item: {
            id: dataset.id,
            name: dataset.name,
            description: dataset.description,
            ownerAddress: dataset.ownerAddress,
          },
          score: Number(r.score),
          textContent: r.text_content as string,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }

  async searchMemories(
    agentId: string,
    query: string,
    limit: number = 10
  ): Promise<ScoredResult<{ id: string; key: string; namespace: string; content: Record<string, unknown> }>[]> {
    if (!query.trim()) return [];

    const queryVector = await this.embedder.embed(query);
    const vectorStr = `[${queryVector.join(",")}]`;

    const results = await this.db.execute(
      sql`SELECT e.source_id, e.text_content,
            1 - (e.embedding <=> ${vectorStr}::vector) as score
          FROM embeddings e
          JOIN agent_memories am ON am.id = e.source_id
          WHERE e.source_type = 'memory'
            AND am.agent_id = ${agentId}::uuid
          ORDER BY e.embedding <=> ${vectorStr}::vector
          LIMIT ${limit}`
    );

    if (!results.rows?.length) return [];

    const sourceIds = results.rows.map((r: Record<string, unknown>) => r.source_id as string);
    const memoryRows = await this.db
      .select()
      .from(agentMemories)
      .where(
        and(
          eq(agentMemories.agentId, agentId),
          sql`${agentMemories.id} = ANY(ARRAY[${sql.join(sourceIds.map((id: string) => sql`${id}::uuid`), sql`, `)}])`
        )
      );

    const memoryMap = new Map(memoryRows.map((m) => [m.id, m]));

    return results.rows
      .map((r: Record<string, unknown>) => {
        const memory = memoryMap.get(r.source_id as string);
        if (!memory) return null;
        return {
          item: {
            id: memory.id,
            key: memory.key,
            namespace: memory.namespace,
            content: memory.content,
          },
          score: Number(r.score),
          textContent: r.text_content as string,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }

  async reindexAll(sourceType: "dataset" | "memory"): Promise<number> {
    let count = 0;

    if (sourceType === "dataset") {
      const allDatasets = await this.db.select().from(datasets);
      for (const dataset of allDatasets) {
        try {
          await this.embedDataset(dataset.id);
          count++;
        } catch {
          // Skip datasets with no text content
        }
      }
    } else {
      const allMemories = await this.db.select().from(agentMemories);
      for (const memory of allMemories) {
        try {
          await this.embedMemory(memory.id);
          count++;
        } catch {
          // Skip memories that fail to embed
        }
      }
    }

    return count;
  }
}
