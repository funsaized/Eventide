/**
 * Trade Queries
 *
 * CRUD operations and queries for trades.
 */

import { query, execute, getDatabase } from "../client";
import type {
  Trade,
  TradeJournalRow,
  CreateTradeInput,
  TradeFilter,
  PaginationOptions,
  SortOptions,
} from "../types";
import { generateId } from "./statements";

/**
 * Get all trades
 */
export async function getTrades(): Promise<Trade[]> {
  return query<Trade>(`SELECT * FROM trades ORDER BY trade_date DESC`);
}

/**
 * Get a trade by ID
 */
export async function getTradeById(id: string): Promise<Trade | null> {
  const results = await query<Trade>(`SELECT * FROM trades WHERE id = ?`, [id]);
  return results[0] ?? null;
}

/**
 * Get trades by import ID
 */
export async function getTradesByImportId(importId: string): Promise<Trade[]> {
  return query<Trade>(
    `SELECT * FROM trades WHERE import_id = ? ORDER BY trade_date DESC`,
    [importId]
  );
}

/**
 * Get trades with pagination and sorting
 */
export async function getTradesPaginated(
  pagination: PaginationOptions,
  sort?: SortOptions
): Promise<{ trades: Trade[]; total: number }> {
  const sortField = sort?.field ?? "trade_date";
  const sortDir = sort?.direction ?? "desc";
  const offset = (pagination.page - 1) * pagination.pageSize;

  // Whitelist sort fields to prevent SQL injection
  const allowedFields = [
    "trade_date",
    "symbol",
    "side",
    "quantity",
    "price",
    "fees",
    "category",
  ];
  const safeField = allowedFields.includes(sortField) ? sortField : "trade_date";
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";

  const trades = await query<Trade>(
    `SELECT * FROM trades ORDER BY ${safeField} ${safeDir} LIMIT ? OFFSET ?`,
    [pagination.pageSize, offset]
  );

  const countResult = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM trades`
  );

  return {
    trades,
    total: countResult[0]?.count ?? 0,
  };
}

/**
 * Get filtered trades with pagination
 */
export async function getFilteredTrades(
  filter: TradeFilter,
  pagination: PaginationOptions,
  sort?: SortOptions
): Promise<{ trades: Trade[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Build WHERE conditions
  if (filter.dateRange) {
    conditions.push("trade_date BETWEEN ? AND ?");
    params.push(filter.dateRange.start, filter.dateRange.end);
  }

  if (filter.categories && filter.categories.length > 0) {
    const placeholders = filter.categories.map(() => "?").join(", ");
    conditions.push(`category IN (${placeholders})`);
    params.push(...filter.categories);
  }

  if (filter.symbols && filter.symbols.length > 0) {
    const placeholders = filter.symbols.map(() => "?").join(", ");
    conditions.push(`symbol IN (${placeholders})`);
    params.push(...filter.symbols);
  }

  if (filter.sides && filter.sides.length > 0) {
    const placeholders = filter.sides.map(() => "?").join(", ");
    conditions.push(`side IN (${placeholders})`);
    params.push(...filter.sides);
  }

  if (filter.importId) {
    conditions.push("import_id = ?");
    params.push(filter.importId);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Sorting
  const sortField = sort?.field ?? "trade_date";
  const sortDir = sort?.direction ?? "desc";
  const allowedFields = [
    "trade_date",
    "symbol",
    "side",
    "quantity",
    "price",
    "fees",
    "category",
  ];
  const safeField = allowedFields.includes(sortField) ? sortField : "trade_date";
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";

  // Pagination
  const offset = (pagination.page - 1) * pagination.pageSize;

  const trades = await query<Trade>(
    `SELECT * FROM trades ${whereClause} ORDER BY ${safeField} ${safeDir} LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, offset]
  );

  const countResult = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM trades ${whereClause}`,
    params
  );

  return {
    trades,
    total: countResult[0]?.count ?? 0,
  };
}

/**
 * Create a new trade
 */
export async function createTrade(input: CreateTradeInput): Promise<Trade> {
  const id = input.id ?? generateId();

  await execute(
    `INSERT INTO trades (
      id, import_id, platform, account_id,
      trade_date, symbol, side, quantity, price, fees,
      trade_type, category, settlement_date, settlement_price,
      platform_metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.import_id,
      input.platform,
      input.account_id,
      input.trade_date,
      input.symbol,
      input.side,
      input.quantity,
      input.price,
      input.fees ?? 0,
      input.trade_type ?? null,
      input.category ?? null,
      input.settlement_date ?? null,
      input.settlement_price ?? null,
      input.platform_metadata ? JSON.stringify(input.platform_metadata) : null,
    ]
  );

  const result = await getTradeById(id);
  if (!result) {
    throw new Error("Failed to create trade");
  }
  return result;
}

/**
 * Create multiple trades
 * Note: Does not manage its own transaction - caller should wrap in transaction() if needed
 */
export async function createTrades(inputs: CreateTradeInput[]): Promise<void> {
  const db = await getDatabase();

  for (const input of inputs) {
    const id = input.id ?? generateId();
    await db.run(
      `INSERT INTO trades (
        id, import_id, platform, account_id,
        trade_date, symbol, side, quantity, price, fees,
        trade_type, category, settlement_date, settlement_price,
        platform_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.import_id,
        input.platform,
        input.account_id,
        input.trade_date,
        input.symbol,
        input.side,
        input.quantity,
        input.price,
        input.fees ?? 0,
        input.trade_type ?? null,
        input.category ?? null,
        input.settlement_date ?? null,
        input.settlement_price ?? null,
        input.platform_metadata
          ? JSON.stringify(input.platform_metadata)
          : null,
      ]
    );
  }
}

/**
 * Delete a trade by ID
 */
export async function deleteTrade(id: string): Promise<void> {
  await execute(`DELETE FROM trades WHERE id = ?`, [id]);
}

/**
 * Delete all trades for an import
 */
export async function deleteTradesByImportId(importId: string): Promise<void> {
  await execute(`DELETE FROM trades WHERE import_id = ?`, [importId]);
}

/**
 * Get unique categories from trades
 */
export async function getUniqueCategories(): Promise<string[]> {
  const results = await query<{ category: string }>(
    `SELECT DISTINCT category FROM trades WHERE category IS NOT NULL ORDER BY category`
  );
  return results.map((r) => r.category);
}

/**
 * Get unique symbols from trades
 */
export async function getUniqueSymbols(): Promise<string[]> {
  const results = await query<{ symbol: string }>(
    `SELECT DISTINCT symbol FROM trades ORDER BY symbol`
  );
  return results.map((r) => r.symbol);
}

/**
 * Get trade count by category
 */
export async function getTradeCountByCategory(): Promise<
  { category: string; count: number }[]
> {
  return query<{ category: string; count: number }>(
    `SELECT category, COUNT(*) as count FROM trades
     WHERE category IS NOT NULL
     GROUP BY category
     ORDER BY count DESC`
  );
}

/**
 * Get total trade count
 */
export async function getTradeCount(): Promise<number> {
  const results = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM trades`
  );
  return results[0]?.count ?? 0;
}

// ============================================================================
// TRADE JOURNAL QUERIES (enriched with computed P&L and status)
// ============================================================================

/**
 * SQL fragment for computing P&L from settlement_price
 */
const PNL_EXPRESSION = `
  CASE
    WHEN t.settlement_price IS NOT NULL THEN
      CASE
        WHEN t.side IN ('YES', 'LONG') THEN ROUND((t.settlement_price - t.price) * t.quantity, 2)
        WHEN t.side IN ('NO', 'SHORT') THEN ROUND(((1.0 - t.settlement_price) - t.price) * t.quantity, 2)
        ELSE NULL
      END
    ELSE NULL
  END`;

/**
 * SQL fragment for deriving OPEN/CLOSED status
 */
const STATUS_EXPRESSION = `CASE WHEN t.settlement_date IS NOT NULL THEN 'CLOSED' ELSE 'OPEN' END`;

/**
 * Get trades for journal view with computed P&L and status.
 * Supports filtering, pagination, and sorting including computed columns.
 */
export async function getTradesForJournal(
  filter: TradeFilter,
  pagination: PaginationOptions,
  sort?: SortOptions
): Promise<{ trades: TradeJournalRow[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Build WHERE conditions
  if (filter.dateRange) {
    conditions.push("t.trade_date BETWEEN ? AND ?");
    params.push(filter.dateRange.start, filter.dateRange.end);
  }

  if (filter.categories && filter.categories.length > 0) {
    const placeholders = filter.categories.map(() => "?").join(", ");
    conditions.push(`t.category IN (${placeholders})`);
    params.push(...filter.categories);
  }

  if (filter.symbols && filter.symbols.length > 0) {
    const placeholders = filter.symbols.map(() => "?").join(", ");
    conditions.push(`t.symbol IN (${placeholders})`);
    params.push(...filter.symbols);
  }

  if (filter.sides && filter.sides.length > 0) {
    const placeholders = filter.sides.map(() => "?").join(", ");
    conditions.push(`t.side IN (${placeholders})`);
    params.push(...filter.sides);
  }

  if (filter.importId) {
    conditions.push("t.import_id = ?");
    params.push(filter.importId);
  }

  // Status filter
  if (filter.status === "OPEN") {
    conditions.push("t.settlement_date IS NULL");
  } else if (filter.status === "CLOSED") {
    conditions.push("t.settlement_date IS NOT NULL");
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Sorting - whitelist including computed columns
  const sortField = sort?.field ?? "trade_date";
  const sortDir = sort?.direction ?? "desc";
  const allowedFields: Record<string, string> = {
    trade_date: "t.trade_date",
    symbol: "t.symbol",
    side: "t.side",
    quantity: "t.quantity",
    price: "t.price",
    fees: "t.fees",
    category: "t.category",
    pnl: `(${PNL_EXPRESSION})`,
    status: `(${STATUS_EXPRESSION})`,
  };
  const safeField = allowedFields[sortField] ?? "t.trade_date";
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";

  // Pagination
  const offset = (pagination.page - 1) * pagination.pageSize;

  const trades = await query<TradeJournalRow>(
    `SELECT t.*,
       ${PNL_EXPRESSION} as pnl,
       ${STATUS_EXPRESSION} as status
     FROM trades t
     ${whereClause}
     ORDER BY ${safeField} ${safeDir}
     LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, offset]
  );

  const countResult = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM trades t ${whereClause}`,
    params
  );

  return {
    trades,
    total: countResult[0]?.count ?? 0,
  };
}
