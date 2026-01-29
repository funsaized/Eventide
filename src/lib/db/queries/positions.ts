/**
 * Position Queries
 *
 * CRUD operations for closed positions, open positions, and cash flows.
 */

import { query, execute, getDatabase } from "../client";
import type {
  ClosedPosition,
  OpenPosition,
  CashFlow,
  CreateClosedPositionInput,
  CreateOpenPositionInput,
  CreateCashFlowInput,
} from "../types";
import { generateId } from "./statements";

// ============================================================================
// CLOSED POSITIONS
// ============================================================================

/**
 * Get all closed positions
 */
export async function getClosedPositions(): Promise<ClosedPosition[]> {
  return query<ClosedPosition>(
    `SELECT * FROM closed_positions ORDER BY exit_date DESC`
  );
}

/**
 * Get a closed position by ID
 */
export async function getClosedPositionById(
  id: string
): Promise<ClosedPosition | null> {
  const results = await query<ClosedPosition>(
    `SELECT * FROM closed_positions WHERE id = ?`,
    [id]
  );
  return results[0] ?? null;
}

/**
 * Get closed positions by import ID
 */
export async function getClosedPositionsByImportId(
  importId: string
): Promise<ClosedPosition[]> {
  return query<ClosedPosition>(
    `SELECT * FROM closed_positions WHERE import_id = ? ORDER BY exit_date DESC`,
    [importId]
  );
}

/**
 * Get closed positions by symbol
 */
export async function getClosedPositionsBySymbol(
  symbol: string
): Promise<ClosedPosition[]> {
  return query<ClosedPosition>(
    `SELECT * FROM closed_positions WHERE symbol = ? ORDER BY exit_date DESC`,
    [symbol]
  );
}

/**
 * Get closed positions by date range
 */
export async function getClosedPositionsByDateRange(
  startDate: string,
  endDate: string
): Promise<ClosedPosition[]> {
  return query<ClosedPosition>(
    `SELECT * FROM closed_positions
     WHERE exit_date BETWEEN ? AND ?
     ORDER BY exit_date DESC`,
    [startDate, endDate]
  );
}

/**
 * Create a closed position
 */
export async function createClosedPosition(
  input: CreateClosedPositionInput
): Promise<ClosedPosition> {
  const id = input.id ?? generateId();

  await execute(
    `INSERT INTO closed_positions (
      id, import_id, platform, symbol,
      entry_date, exit_date, entry_price, exit_price, quantity,
      gross_pnl, fees, net_pnl, calculated_pnl, pnl_discrepancy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.import_id,
      input.platform,
      input.symbol,
      input.entry_date ?? null,
      input.exit_date ?? null,
      input.entry_price ?? null,
      input.exit_price ?? null,
      input.quantity ?? null,
      input.gross_pnl,
      input.fees ?? null,
      input.net_pnl ?? null,
      input.calculated_pnl ?? null,
      input.pnl_discrepancy ?? null,
    ]
  );

  const result = await getClosedPositionById(id);
  if (!result) {
    throw new Error("Failed to create closed position");
  }
  return result;
}

/**
 * Create multiple closed positions in a transaction
 */
export async function createClosedPositions(
  inputs: CreateClosedPositionInput[]
): Promise<void> {
  const db = await getDatabase();

  await db.run("BEGIN TRANSACTION");

  try {
    for (const input of inputs) {
      const id = input.id ?? generateId();
      await db.run(
        `INSERT INTO closed_positions (
          id, import_id, platform, symbol,
          entry_date, exit_date, entry_price, exit_price, quantity,
          gross_pnl, fees, net_pnl, calculated_pnl, pnl_discrepancy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.import_id,
          input.platform,
          input.symbol,
          input.entry_date ?? null,
          input.exit_date ?? null,
          input.entry_price ?? null,
          input.exit_price ?? null,
          input.quantity ?? null,
          input.gross_pnl,
          input.fees ?? null,
          input.net_pnl ?? null,
          input.calculated_pnl ?? null,
          input.pnl_discrepancy ?? null,
        ]
      );
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

/**
 * Get total realized P&L
 */
export async function getTotalRealizedPnL(): Promise<number> {
  const results = await query<{ total: number | null }>(
    `SELECT SUM(net_pnl) as total FROM closed_positions`
  );
  return results[0]?.total ?? 0;
}

/**
 * Get win rate (count-based)
 */
export async function getWinRateByCount(): Promise<number> {
  const results = await query<{ win_rate: number | null }>(
    `SELECT
      CAST(SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as win_rate
     FROM closed_positions`
  );
  return results[0]?.win_rate ?? 0;
}

/**
 * Get win rate (volume-weighted)
 */
export async function getWinRateByVolume(): Promise<number> {
  const results = await query<{ win_rate: number | null }>(
    `SELECT
      CASE
        WHEN SUM(ABS(net_pnl)) > 0
        THEN SUM(CASE WHEN net_pnl > 0 THEN ABS(net_pnl) ELSE 0 END) / SUM(ABS(net_pnl))
        ELSE 0
      END as win_rate
     FROM closed_positions`
  );
  return results[0]?.win_rate ?? 0;
}

// ============================================================================
// OPEN POSITIONS
// ============================================================================

/**
 * Get all open positions from the latest snapshot
 */
export async function getCurrentOpenPositions(): Promise<OpenPosition[]> {
  return query<OpenPosition>(
    `SELECT * FROM open_positions
     WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM open_positions)
     ORDER BY symbol`
  );
}

/**
 * Get open positions by snapshot date
 */
export async function getOpenPositionsBySnapshotDate(
  snapshotDate: string
): Promise<OpenPosition[]> {
  return query<OpenPosition>(
    `SELECT * FROM open_positions WHERE snapshot_date = ? ORDER BY symbol`,
    [snapshotDate]
  );
}

/**
 * Create an open position
 */
export async function createOpenPosition(
  input: CreateOpenPositionInput
): Promise<OpenPosition> {
  const id = input.id ?? generateId();

  await execute(
    `INSERT INTO open_positions (
      id, import_id, snapshot_date, symbol, side,
      quantity, cost_basis, current_price, market_value, unrealized_pnl
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.import_id,
      input.snapshot_date,
      input.symbol,
      input.side ?? null,
      input.quantity ?? null,
      input.cost_basis ?? null,
      input.current_price ?? null,
      input.market_value ?? null,
      input.unrealized_pnl ?? null,
    ]
  );

  const results = await query<OpenPosition>(
    `SELECT * FROM open_positions WHERE id = ?`,
    [id]
  );
  if (!results[0]) {
    throw new Error("Failed to create open position");
  }
  return results[0];
}

/**
 * Create multiple open positions in a transaction
 */
export async function createOpenPositions(
  inputs: CreateOpenPositionInput[]
): Promise<void> {
  const db = await getDatabase();

  await db.run("BEGIN TRANSACTION");

  try {
    for (const input of inputs) {
      const id = input.id ?? generateId();
      await db.run(
        `INSERT INTO open_positions (
          id, import_id, snapshot_date, symbol, side,
          quantity, cost_basis, current_price, market_value, unrealized_pnl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.import_id,
          input.snapshot_date,
          input.symbol,
          input.side ?? null,
          input.quantity ?? null,
          input.cost_basis ?? null,
          input.current_price ?? null,
          input.market_value ?? null,
          input.unrealized_pnl ?? null,
        ]
      );
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

/**
 * Get total unrealized P&L from latest snapshot
 */
export async function getTotalUnrealizedPnL(): Promise<number> {
  const results = await query<{ total: number | null }>(
    `SELECT SUM(unrealized_pnl) as total FROM open_positions
     WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM open_positions)`
  );
  return results[0]?.total ?? 0;
}

// ============================================================================
// CASH FLOWS
// ============================================================================

/**
 * Get all cash flows
 */
export async function getCashFlows(): Promise<CashFlow[]> {
  return query<CashFlow>(`SELECT * FROM cash_flows ORDER BY date DESC`);
}

/**
 * Get cash flows by import ID
 */
export async function getCashFlowsByImportId(
  importId: string
): Promise<CashFlow[]> {
  return query<CashFlow>(
    `SELECT * FROM cash_flows WHERE import_id = ? ORDER BY date DESC`,
    [importId]
  );
}

/**
 * Create a cash flow
 */
export async function createCashFlow(input: CreateCashFlowInput): Promise<CashFlow> {
  const id = input.id ?? generateId();

  await execute(
    `INSERT INTO cash_flows (id, import_id, date, type, amount, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.import_id,
      input.date,
      input.type,
      input.amount,
      input.description ?? null,
    ]
  );

  const results = await query<CashFlow>(
    `SELECT * FROM cash_flows WHERE id = ?`,
    [id]
  );
  if (!results[0]) {
    throw new Error("Failed to create cash flow");
  }
  return results[0];
}

/**
 * Create multiple cash flows in a transaction
 */
export async function createCashFlows(
  inputs: CreateCashFlowInput[]
): Promise<void> {
  const db = await getDatabase();

  await db.run("BEGIN TRANSACTION");

  try {
    for (const input of inputs) {
      const id = input.id ?? generateId();
      await db.run(
        `INSERT INTO cash_flows (id, import_id, date, type, amount, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.import_id,
          input.date,
          input.type,
          input.amount,
          input.description ?? null,
        ]
      );
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

/**
 * Get total deposits
 */
export async function getTotalDeposits(): Promise<number> {
  const results = await query<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM cash_flows WHERE type = 'DEPOSIT'`
  );
  return results[0]?.total ?? 0;
}

/**
 * Get total withdrawals
 */
export async function getTotalWithdrawals(): Promise<number> {
  const results = await query<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM cash_flows WHERE type = 'WITHDRAWAL'`
  );
  return results[0]?.total ?? 0;
}

/**
 * Get net cash flow (deposits - withdrawals)
 */
export async function getNetCashFlow(): Promise<number> {
  const deposits = await getTotalDeposits();
  const withdrawals = await getTotalWithdrawals();
  return deposits - Math.abs(withdrawals);
}
