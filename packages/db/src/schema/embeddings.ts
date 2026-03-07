import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";

// Custom pgvector type for Drizzle ORM
const vector384 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(384)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    const cleaned = value.replace(/^\[/, "").replace(/\]$/, "");
    return cleaned.split(",").map(Number);
  },
});

export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceType: text("source_type").notNull(), // 'dataset' | 'memory'
    sourceId: uuid("source_id").notNull(),
    embedding: vector384("embedding").notNull(),
    model: text("model").notNull().default("all-MiniLM-L6-v2"),
    textContent: text("text_content"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("embeddings_source_type_source_id_idx").on(
      table.sourceType,
      table.sourceId
    ),
  ]
);

export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
