/**
 * Database Client - wa-sqlite with IndexedDB persistence
 *
 * Uses @subframe7536/sqlite-wasm for browser-based SQLite with persistence.
 * Currently uses IndexedDB for main-thread compatibility.
 * Can be upgraded to OPFS (Web Worker required) for better performance.
 */

import { initSQLite } from "@subframe7536/sqlite-wasm";
// Note: createIdbStorage (renamed from useIdbStorage) is NOT a React hook
// It's a factory function from sqlite-wasm for IndexedDB storage
import { useIdbStorage as createIdbStorage } from "@subframe7536/sqlite-wasm/idb";
import { runMigrations } from "./migrations";

// Database configuration
const DB_NAME = "rubbin-hood.db";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@subframe7536/sqlite-wasm@0.5.0/wa-sqlite-async.wasm";

// Database instance type
export type SQLiteDB = Awaited<ReturnType<typeof initSQLite>>;

// Singleton database instance
let dbInstance: SQLiteDB | null = null;
let initPromise: Promise<SQLiteDB> | null = null;

/**
 * Check if the browser supports OPFS (Chromium-based browsers)
 */
export async function isOPFSSupported(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined") return false;
    if (!("storage" in navigator)) return false;
    const root = await navigator.storage.getDirectory();
    return root !== undefined;
  } catch {
    return false;
  }
}

/**
 * Check if browser is Chromium-based (required for OPFS)
 */
export function isChromiumBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Chrome, Edge, Brave, Opera all contain "Chrome" in UA
  return /Chrome/.test(ua) && !/Edg/.test(ua) ? true : /Chrome|Edg|OPR/.test(ua);
}

/**
 * Initialize the database with IndexedDB persistence
 */
async function createDatabase(): Promise<SQLiteDB> {
  console.log("[DB] Initializing database...");

  const db = await initSQLite(
    createIdbStorage(DB_NAME, {
      url: WASM_URL,
    })
  );

  // Check if we need to run migrations
  await runMigrations(db);

  console.log("[DB] Database initialized successfully");
  return db;
}

/**
 * Get the database instance (singleton pattern)
 */
export async function getDatabase(): Promise<SQLiteDB> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = createDatabase();
  dbInstance = await initPromise;
  return dbInstance;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    initPromise = null;
    console.log("[DB] Database connection closed");
  }
}

/**
 * Export the database as a Uint8Array (for backup/download)
 */
export async function exportDatabase(): Promise<Uint8Array> {
  const db = await getDatabase();
  const buffer = await db.dump();
  return buffer;
}

/**
 * Execute a SQL query with parameters
 */
export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const db = await getDatabase();
  return (await db.run(sql, params)) as T[];
}

/**
 * Execute a SQL statement (INSERT, UPDATE, DELETE)
 */
export async function execute(
  sql: string,
  params?: unknown[]
): Promise<{ changes: number; lastInsertRowId: number }> {
  const db = await getDatabase();
  await db.run(sql, params);
  return {
    changes: Number(db.changes()),
    lastInsertRowId: Number(db.lastInsertRowId()),
  };
}

/**
 * Execute multiple SQL statements in a transaction
 */
export async function transaction<T>(
  fn: (db: SQLiteDB) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  try {
    await db.run("BEGIN TRANSACTION");
    const result = await fn(db);
    await db.run("COMMIT");
    return result;
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  version: number;
  tableCount: number;
}> {
  try {
    const db = await getDatabase();

    const version = (await db.run(
      `SELECT MAX(version) as version FROM schema_version`
    )) as { version: number }[];

    const tables = (await db.run(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`
    )) as { count: number }[];

    return {
      ok: true,
      version: version[0]?.version ?? 0,
      tableCount: tables[0]?.count ?? 0,
    };
  } catch (error) {
    console.error("[DB] Health check failed:", error);
    return {
      ok: false,
      version: 0,
      tableCount: 0,
    };
  }
}
