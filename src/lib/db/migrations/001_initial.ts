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
