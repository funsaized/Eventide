/**
 * Query Utilities
 *
 * Shared helpers and SQL fragments for database queries.
 */

import type {
  CreateCashFlowInput,
  CreateClosedPositionInput,
  CreateOpenPositionInput,
  CreateTradeInput,
  PositionSortField,
  TradeFilter,
  TradeSortField,
} from "../types";

export const TRADE_LIST_SORT_FIELDS = [
  "trade_date",
  "symbol",
  "side",
  "quantity",
  "price",
  "fees",
  "category",
] as const satisfies readonly TradeSortField[];

export const TRADE_SORT_FIELDS = [
  ...TRADE_LIST_SORT_FIELDS,
  "pnl",
  "status",
] as const satisfies readonly TradeSortField[];

export const POSITION_SORT_FIELDS = [
  "first_trade_date",
  "last_trade_date",
  "symbol",
  "net_pnl",
  "total_fees",
  "trade_count",
  "category",
  "status",
] as const satisfies readonly PositionSortField[];

export const TRADE_JOURNAL_SORT_FIELDS: Record<TradeSortField, string> = {
  trade_date: "t.trade_date",
  symbol: "t.symbol",
  side: "t.side",
  quantity: "t.quantity",
  price: "t.price",
  fees: "t.fees",
  category: "t.category",
  pnl: "pnl",
  status: "status",
};

export const POSITION_JOURNAL_SORT_FIELDS: Record<PositionSortField, string> = {
  first_trade_date: "first_trade_date",
  last_trade_date: "last_trade_date",
  symbol: "symbol",
  net_pnl: "COALESCE(net_pnl, 0)",
  total_fees: "total_fees",
  trade_count: "trade_count",
  category: "COALESCE(category, '')",
  status: "status",
};

export const TRADE_INSERT_SQL = `INSERT INTO trades (
  id, import_id, platform, account_id,
  trade_date, symbol, side, quantity, price, fees,
  trade_type, category, settlement_date, settlement_price,
  platform_metadata
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export const CLOSED_POSITION_INSERT_SQL = `INSERT INTO closed_positions (
  id, import_id, platform, symbol,
  entry_date, exit_date, entry_price, exit_price, quantity,
  gross_pnl, fees, net_pnl, calculated_pnl, pnl_discrepancy
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export const OPEN_POSITION_INSERT_SQL = `INSERT INTO open_positions (
  id, import_id, snapshot_date, symbol, side,
  quantity, cost_basis, current_price, market_value, unrealized_pnl
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export const CASH_FLOW_INSERT_SQL = `INSERT INTO cash_flows (
  id, import_id, date, type, amount, description
) VALUES (?, ?, ?, ?, ?, ?)`;

function isSortFieldMap(
  allowedFields: readonly string[] | Record<string, string>
): allowedFields is Record<string, string> {
  return !Array.isArray(allowedFields);
}

export function buildSortClause(
  field: string | undefined,
  direction: "asc" | "desc" | undefined,
  allowedFields: readonly string[] | Record<string, string>,
  defaultField: string
): string {
  const safeDirection = direction === "asc" ? "ASC" : "DESC";

  if (Array.isArray(allowedFields)) {
    let safeField = defaultField;

    if (field) {
      for (const allowedField of allowedFields) {
        if (allowedField === field) {
          safeField = allowedField;
          break;
        }
      }
    }

    return `ORDER BY ${safeField} ${safeDirection}`;
  }

  if (!isSortFieldMap(allowedFields)) {
    return `ORDER BY ${defaultField} ${safeDirection}`;
  }

  const safeField =
    field && Object.hasOwn(allowedFields, field)
      ? allowedFields[field]
      : allowedFields[defaultField];

  return `ORDER BY ${safeField} ${safeDirection}`;
}

export function buildFilterWhereClauses(filter: TradeFilter): {
  where: string;
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

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

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

export function TRADE_INSERT_PARAMS(
  trade: CreateTradeInput & { id: string }
): unknown[] {
  return [
    trade.id,
    trade.import_id,
    trade.platform,
    trade.account_id,
    trade.trade_date,
    trade.symbol,
    trade.side,
    trade.quantity,
    trade.price,
    trade.fees ?? 0,
    trade.trade_type ?? null,
    trade.category ?? null,
    trade.settlement_date ?? null,
    trade.settlement_price ?? null,
    trade.platform_metadata ? JSON.stringify(trade.platform_metadata) : null,
  ];
}

export function CLOSED_POSITION_INSERT_PARAMS(
  position: CreateClosedPositionInput & { id: string }
): unknown[] {
  return [
    position.id,
    position.import_id,
    position.platform,
    position.symbol,
    position.entry_date ?? null,
    position.exit_date ?? null,
    position.entry_price ?? null,
    position.exit_price ?? null,
    position.quantity ?? null,
    position.gross_pnl,
    position.fees ?? null,
    position.net_pnl ?? null,
    position.calculated_pnl ?? null,
    position.pnl_discrepancy ?? null,
  ];
}

export function OPEN_POSITION_INSERT_PARAMS(
  position: CreateOpenPositionInput & { id: string }
): unknown[] {
  return [
    position.id,
    position.import_id,
    position.snapshot_date,
    position.symbol,
    position.side ?? null,
    position.quantity ?? null,
    position.cost_basis ?? null,
    position.current_price ?? null,
    position.market_value ?? null,
    position.unrealized_pnl ?? null,
  ];
}

export function CASH_FLOW_INSERT_PARAMS(
  cashFlow: CreateCashFlowInput & { id: string }
): unknown[] {
  return [
    cashFlow.id,
    cashFlow.import_id,
    cashFlow.date,
    cashFlow.type,
    cashFlow.amount,
    cashFlow.description ?? null,
  ];
}
