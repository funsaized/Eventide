/**
 * Migration 001: Initial Schema
 *
 * Creates all initial tables, indexes, and views for the Rubbin Hood database.
 */

import type { SQLiteDB } from "../client";
import { SCHEMA } from "../schema";

export const migration_001 = {
  version: 1,
  description: "Initial schema with multi-platform support",

  /**
   * Apply the migration
   */
  up: async (db: SQLiteDB): Promise<void> => {
    // Execute the full schema
    await db.run(SCHEMA);
  },

  /**
   * Rollback the migration (best effort)
   * Note: SQLite doesn't support DROP VIEW IF EXISTS in all versions,
   * so we wrap in try-catch
   */
  down: async (db: SQLiteDB): Promise<void> => {
    // Drop views first (they depend on tables)
    try {
      await db.run("DROP VIEW IF EXISTS portfolio_snapshot");
      await db.run("DROP VIEW IF EXISTS category_performance");
      await db.run("DROP VIEW IF EXISTS monthly_performance");
    } catch {
      // Views might not exist
    }

    // Drop indexes
    await db.run("DROP INDEX IF EXISTS idx_open_positions_snapshot");
    await db.run("DROP INDEX IF EXISTS idx_cash_flows_type");
    await db.run("DROP INDEX IF EXISTS idx_cash_flows_date");
    await db.run("DROP INDEX IF EXISTS idx_closed_positions_symbol");
    await db.run("DROP INDEX IF EXISTS idx_closed_positions_date");
    await db.run("DROP INDEX IF EXISTS idx_trades_import");
    await db.run("DROP INDEX IF EXISTS idx_trades_category");
    await db.run("DROP INDEX IF EXISTS idx_trades_symbol");
    await db.run("DROP INDEX IF EXISTS idx_trades_date");

    // Drop tables (order matters due to foreign keys)
    await db.run("DROP TABLE IF EXISTS import_duplicates");
    await db.run("DROP TABLE IF EXISTS user_settings");
    await db.run("DROP TABLE IF EXISTS schema_version");
    await db.run("DROP TABLE IF EXISTS open_positions");
    await db.run("DROP TABLE IF EXISTS cash_flows");
    await db.run("DROP TABLE IF EXISTS closed_positions");
    await db.run("DROP TABLE IF EXISTS trades");
    await db.run("DROP TABLE IF EXISTS statement_imports");
  },
};

/**
 * All migrations in order
 */
export const migrations = [migration_001];

/**
 * Get current schema version
 */
export async function getCurrentVersion(db: SQLiteDB): Promise<number> {
  try {
    const result = (await db.run(
      "SELECT MAX(version) as version FROM schema_version"
    )) as { version: number }[];
    return result[0]?.version ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(db: SQLiteDB): Promise<void> {
  const currentVersion = await getCurrentVersion(db);
  const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log("[Migrations] No pending migrations");
    return;
  }

  console.log(
    `[Migrations] Running ${pendingMigrations.length} pending migration(s)`
  );

  for (const migration of pendingMigrations) {
    console.log(`[Migrations] Applying migration ${migration.version}: ${migration.description}`);

    try {
      await db.run("BEGIN TRANSACTION");
      await migration.up(db);
      await db.run(
        "INSERT INTO schema_version (version, description) VALUES (?, ?)",
        [migration.version, migration.description]
      );
      await db.run("COMMIT");
      console.log(`[Migrations] Migration ${migration.version} applied successfully`);
    } catch (error) {
      await db.run("ROLLBACK");
      console.error(`[Migrations] Migration ${migration.version} failed:`, error);
      throw new Error(
        `Migration ${migration.version} failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log("[Migrations] All migrations applied successfully");
}
