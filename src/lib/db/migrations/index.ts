/**
 * Database Migrations
 *
 * Manages schema versioning and migrations for the Rubbin Hood database.
 *
 * To add a new migration:
 * 1. Create a new file: migrations/002_description.ts
 * 2. Export a migration object with version, description, up(), and down()
 * 3. Import and add it to the migrations array below
 */

import type { SQLiteDB } from "../client";
import { migration_001 } from "./001_initial";

/**
 * All migrations in order (add new migrations here)
 */
export const migrations = [
  migration_001,
  // migration_002,
  // migration_003,
];

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

/**
 * Rollback the last migration (for development/testing)
 */
export async function rollbackLastMigration(db: SQLiteDB): Promise<void> {
  const currentVersion = await getCurrentVersion(db);
  if (currentVersion === 0) {
    console.log("[Migrations] No migrations to rollback");
    return;
  }

  const migration = migrations.find((m) => m.version === currentVersion);
  if (!migration) {
    throw new Error(`Migration ${currentVersion} not found`);
  }

  console.log(`[Migrations] Rolling back migration ${migration.version}: ${migration.description}`);

  try {
    await db.run("BEGIN TRANSACTION");
    await migration.down(db);
    await db.run("DELETE FROM schema_version WHERE version = ?", [migration.version]);
    await db.run("COMMIT");
    console.log(`[Migrations] Migration ${migration.version} rolled back successfully`);
  } catch (error) {
    await db.run("ROLLBACK");
    throw new Error(
      `Rollback of migration ${migration.version} failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
