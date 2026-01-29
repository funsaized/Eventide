/**
 * Statement Import Queries
 *
 * CRUD operations for statement imports.
 */

import { query, execute, transaction } from "../client";
import type {
  StatementImport,
  CreateStatementImportInput,
} from "../types";

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get all statement imports
 */
export async function getStatementImports(): Promise<StatementImport[]> {
  return query<StatementImport>(
    `SELECT * FROM statement_imports ORDER BY statement_date DESC`
  );
}

/**
 * Get a statement import by ID
 */
export async function getStatementImportById(
  id: string
): Promise<StatementImport | null> {
  const results = await query<StatementImport>(
    `SELECT * FROM statement_imports WHERE id = ?`,
    [id]
  );
  return results[0] ?? null;
}

/**
 * Get a statement import by platform, account, and date
 */
export async function getStatementImportByKey(
  platform: string,
  accountNumber: string,
  statementDate: string
): Promise<StatementImport | null> {
  const results = await query<StatementImport>(
    `SELECT * FROM statement_imports
     WHERE platform = ? AND account_number = ? AND statement_date = ?`,
    [platform, accountNumber, statementDate]
  );
  return results[0] ?? null;
}

/**
 * Check if a statement import already exists (duplicate detection)
 */
export async function checkDuplicateImport(
  platform: string,
  accountNumber: string,
  statementDate: string
): Promise<StatementImport | null> {
  return getStatementImportByKey(platform, accountNumber, statementDate);
}

/**
 * Create a new statement import
 */
export async function createStatementImport(
  input: CreateStatementImportInput
): Promise<StatementImport> {
  const id = input.id ?? generateId();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO statement_imports (
      id, platform, account_number, statement_date,
      statement_period_start, statement_period_end,
      parser_version, import_timestamp,
      net_liquidity, total_fees, ending_cash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.platform,
      input.account_number,
      input.statement_date,
      input.statement_period_start ?? null,
      input.statement_period_end ?? null,
      input.parser_version,
      now,
      input.net_liquidity ?? null,
      input.total_fees ?? null,
      input.ending_cash ?? null,
    ]
  );

  const result = await getStatementImportById(id);
  if (!result) {
    throw new Error("Failed to create statement import");
  }
  return result;
}

/**
 * Delete a statement import and all related data
 */
export async function deleteStatementImport(id: string): Promise<void> {
  // CASCADE will handle related records
  await execute(`DELETE FROM statement_imports WHERE id = ?`, [id]);
}

/**
 * Get the most recent statement import
 */
export async function getLatestStatementImport(): Promise<StatementImport | null> {
  const results = await query<StatementImport>(
    `SELECT * FROM statement_imports ORDER BY statement_date DESC LIMIT 1`
  );
  return results[0] ?? null;
}

/**
 * Get statement imports by date range
 */
export async function getStatementImportsByDateRange(
  startDate: string,
  endDate: string
): Promise<StatementImport[]> {
  return query<StatementImport>(
    `SELECT * FROM statement_imports
     WHERE statement_date BETWEEN ? AND ?
     ORDER BY statement_date DESC`,
    [startDate, endDate]
  );
}

/**
 * Get total import count
 */
export async function getStatementImportCount(): Promise<number> {
  const results = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM statement_imports`
  );
  return results[0]?.count ?? 0;
}

/**
 * Replace an existing statement import (for duplicate handling)
 */
export async function replaceStatementImport(
  existingId: string,
  input: CreateStatementImportInput
): Promise<StatementImport> {
  return transaction(async () => {
    // Delete existing import (CASCADE handles related records)
    await deleteStatementImport(existingId);
    // Create new import
    return createStatementImport(input);
  });
}
