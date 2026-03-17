import { createDb } from "@forsety/db";
import type { Database } from "@forsety/db";
import { getEnv } from "./env";

let db: Database | null = null;

/**
 * Singleton DB connection — prevents connection pool exhaustion
 * from per-request createDb() calls in auth routes.
 */
export function getDb(): Database {
  if (!db) {
    db = createDb(getEnv().DATABASE_URL);
  }
  return db;
}
