/**
 * Trade Queries
 *
 * CRUD operations and queries for trades.
 */

import { query, execute, getDatabase } from "../client";
import type {
  Trade,
  TradeJournalRow,
  PositionJournalRow,
  PositionJournalTotals,
  CreateTradeInput,
  PositionSortField,
  TradeFilter,
  PaginationOptions,
  SortOptions,
  TradeSortField,
} from "../types";
import { generateId } from "./statements";
import {
  buildFilterWhereClauses,
  buildSortClause,
  POSITION_JOURNAL_SORT_FIELDS,
  TRADE_INSERT_PARAMS,
  TRADE_INSERT_SQL,
  TRADE_JOURNAL_SORT_FIELDS,
  TRADE_LIST_SORT_FIELDS,
} from "./query-utils";

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
  sort?: SortOptions<TradeSortField>
): Promise<{ trades: Trade[]; total: number }> {
  const offset = (pagination.page - 1) * pagination.pageSize;
  const orderByClause = buildSortClause(
    sort?.field,
    sort?.direction,
    TRADE_LIST_SORT_FIELDS,
    "trade_date"
  );

  const trades = await query<Trade>(
    `SELECT * FROM trades ${orderByClause} LIMIT ? OFFSET ?`,
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
  sort?: SortOptions<TradeSortField>
): Promise<{ trades: Trade[]; total: number }> {
  const { where: whereClause, params } = buildFilterWhereClauses(filter);
  const orderByClause = buildSortClause(
    sort?.field,
    sort?.direction,
    TRADE_LIST_SORT_FIELDS,
    "trade_date"
  );
  const offset = (pagination.page - 1) * pagination.pageSize;

  const trades = await query<Trade>(
    `SELECT t.* FROM trades t ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`,
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

/**
 * Create a new trade
 */
export async function createTrade(input: CreateTradeInput): Promise<Trade> {
  const id = input.id ?? generateId();

  await execute(TRADE_INSERT_SQL, TRADE_INSERT_PARAMS({ ...input, id }));

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
    await db.run(TRADE_INSERT_SQL, TRADE_INSERT_PARAMS({ ...input, id }));
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
  sort?: SortOptions<TradeSortField>
): Promise<{ trades: TradeJournalRow[]; total: number }> {
  const { where: baseWhere, params } = buildFilterWhereClauses(filter);

  const extraConditions: string[] = [];

  if (filter.status === "OPEN") {
    extraConditions.push("t.settlement_date IS NULL");
  } else if (filter.status === "CLOSED") {
    extraConditions.push("t.settlement_date IS NOT NULL");
  }

  if (filter.minPnl != null) {
    extraConditions.push(`(${PNL_EXPRESSION}) >= ?`);
    params.push(filter.minPnl);
  }

  if (filter.maxPnl != null) {
    extraConditions.push(`(${PNL_EXPRESSION}) <= ?`);
    params.push(filter.maxPnl);
  }

  let whereClause = baseWhere;
  if (extraConditions.length > 0) {
    whereClause = whereClause
      ? `${whereClause} AND ${extraConditions.join(" AND ")}`
      : `WHERE ${extraConditions.join(" AND ")}`;
  }

  const orderByClause = buildSortClause(
    sort?.field,
    sort?.direction,
    {
      ...TRADE_JOURNAL_SORT_FIELDS,
      pnl: `(${PNL_EXPRESSION})`,
      status: `(${STATUS_EXPRESSION})`,
    },
    "trade_date"
  );

  const offset = (pagination.page - 1) * pagination.pageSize;

  const trades = await query<TradeJournalRow>(
     `SELECT t.*,
       ${PNL_EXPRESSION} as pnl,
       ${STATUS_EXPRESSION} as status
     FROM trades t
     ${whereClause}
     ${orderByClause}
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

// ============================================================================
// POSITION JOURNAL QUERIES (grouped by symbol, P&L from closed_positions)
// ============================================================================

/**
 * Sort field whitelist for position journal queries
 */
function buildPositionFilters(filter: TradeFilter): {
  tradeWhere: string;
  tradeParams: unknown[];
  positionWhere: string;
  positionParams: unknown[];
} {
  const { where: tradeWhere, params: tradeParams } = buildFilterWhereClauses(filter);

  const positionConditions: string[] = [];
  const positionParams: unknown[] = [];

  if (filter.status === "OPEN") {
    positionConditions.push("status = ?");
    positionParams.push("OPEN");
  } else if (filter.status === "CLOSED") {
    positionConditions.push("status = ?");
    positionParams.push("CLOSED");
  }

  if (filter.minPnl != null) {
    positionConditions.push("COALESCE(net_pnl, 0) >= ?");
    positionParams.push(filter.minPnl);
  }

  if (filter.maxPnl != null) {
    positionConditions.push("COALESCE(net_pnl, 0) <= ?");
    positionParams.push(filter.maxPnl);
  }

  const positionWhere =
    positionConditions.length > 0
      ? `WHERE ${positionConditions.join(" AND ")}`
      : "";

  return { tradeWhere, tradeParams, positionWhere, positionParams };
}

const POSITION_CTE_BODY = `
  SELECT
    t.symbol,
    MAX(t.category) AS category,
    MIN(t.trade_date) AS first_trade_date,
    MAX(t.trade_date) AS last_trade_date,
    COUNT(*) AS trade_count,
    SUM(CASE WHEN t.side IN ('YES','LONG') THEN t.quantity ELSE 0 END) AS yes_quantity,
    SUM(CASE WHEN t.side IN ('NO','SHORT') THEN t.quantity ELSE 0 END) AS no_quantity,
    CASE
      WHEN SUM(CASE WHEN t.side IN ('YES','LONG') THEN t.quantity ELSE 0 END) > 0
      THEN ROUND(
        SUM(CASE WHEN t.side IN ('YES','LONG') THEN t.price * t.quantity ELSE 0 END) /
        SUM(CASE WHEN t.side IN ('YES','LONG') THEN t.quantity ELSE 0 END), 4)
      ELSE NULL
    END AS avg_entry_price,
    CASE
      WHEN SUM(CASE WHEN t.side IN ('NO','SHORT') THEN t.quantity ELSE 0 END) > 0
      THEN ROUND(
        SUM(CASE WHEN t.side IN ('NO','SHORT') THEN t.price * t.quantity ELSE 0 END) /
        SUM(CASE WHEN t.side IN ('NO','SHORT') THEN t.quantity ELSE 0 END), 4)
      ELSE NULL
    END AS avg_exit_price,
    SUM(t.fees) AS total_fees,
    cp_agg.gross_pnl,
    cp_agg.net_pnl,
    CASE WHEN cp_agg.symbol IS NOT NULL THEN 'CLOSED' ELSE 'OPEN' END AS status
  FROM trades t
  LEFT JOIN (
    SELECT symbol, SUM(gross_pnl) AS gross_pnl, SUM(COALESCE(net_pnl, gross_pnl)) AS net_pnl
    FROM closed_positions GROUP BY symbol  -- Single-account app; safe without account_id
  ) cp_agg ON cp_agg.symbol = t.symbol`;

function buildPositionCte(tradeWhere: string): string {
  return `WITH position_groups AS (${POSITION_CTE_BODY} ${tradeWhere} GROUP BY t.symbol)`;
}

/**
 * Get positions for journal view grouped by symbol with P&L from closed_positions.
 * Supports filtering, pagination, and sorting.
 */
export async function getPositionsForJournal(
  filter: TradeFilter,
  pagination: PaginationOptions,
  sort?: SortOptions<PositionSortField>
): Promise<{ positions: PositionJournalRow[]; total: number }> {
  const { tradeWhere, tradeParams, positionWhere, positionParams } =
    buildPositionFilters(filter);

  const orderByClause = buildSortClause(
    sort?.field,
    sort?.direction,
    POSITION_JOURNAL_SORT_FIELDS,
    "first_trade_date"
  );

  const offset = (pagination.page - 1) * pagination.pageSize;
  const cte = buildPositionCte(tradeWhere);

  const positions = await query<PositionJournalRow>(
    `${cte}
     SELECT * FROM position_groups
     ${positionWhere}
     ${orderByClause}
     LIMIT ? OFFSET ?`,
    [...tradeParams, ...positionParams, pagination.pageSize, offset]
  );

  const countResult = await query<{ count: number }>(
    `${cte}
     SELECT COUNT(*) AS count FROM position_groups
     ${positionWhere}`,
    [...tradeParams, ...positionParams]
  );

  return {
    positions,
    total: countResult[0]?.count ?? 0,
  };
}

/**
 * Get aggregated totals across all filtered positions (ignores pagination).
 */
export async function getPositionJournalTotals(
  filter: TradeFilter
): Promise<PositionJournalTotals> {
  const { tradeWhere, tradeParams, positionWhere, positionParams } =
    buildPositionFilters(filter);

  const cte = buildPositionCte(tradeWhere);

  const result = await query<PositionJournalTotals>(
    `${cte}
     SELECT
       COUNT(*) AS position_count,
       COALESCE(SUM(net_pnl), 0) AS total_net_pnl,
       COALESCE(SUM(gross_pnl), 0) AS total_gross_pnl,
       COALESCE(SUM(total_fees), 0) AS total_fees,
       COALESCE(SUM(yes_quantity), 0) AS total_quantity,
       SUM(CASE WHEN COALESCE(net_pnl, 0) > 0 THEN 1 ELSE 0 END) AS wins,
       SUM(CASE WHEN COALESCE(net_pnl, 0) <= 0 AND status = 'CLOSED' THEN 1 ELSE 0 END) AS losses
     FROM position_groups
     ${positionWhere}`,
    [...tradeParams, ...positionParams]
  );

  return result[0] ?? {
    position_count: 0,
    total_net_pnl: 0,
    total_gross_pnl: 0,
    total_fees: 0,
    total_quantity: 0,
    wins: 0,
    losses: 0,
  };
}

/**
 * Get all trades for a specific position (symbol), ordered chronologically.
 */
export async function getTradesForPosition(symbol: string): Promise<TradeJournalRow[]> {
  return query<TradeJournalRow>(
    `SELECT t.*,
       ${PNL_EXPRESSION} as pnl,
       ${STATUS_EXPRESSION} as status
     FROM trades t
     WHERE t.symbol = ?
     ORDER BY t.trade_date ASC, t.side ASC`,
    [symbol]
  );
}
