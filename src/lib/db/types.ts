/**
 * Database Types for Rubbin Hood
 *
 * TypeScript interfaces matching the SQLite schema.
 */

// Platform types
export type Platform = "robinhood" | "kalshi" | "forecastex";

// Trade side
export type TradeSide = "YES" | "NO" | "LONG" | "SHORT";

// Trade type
export type TradeType = "OPEN" | "CLOSE" | "ADJUST";

// Cash flow type
export type CashFlowType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "INTEREST"
  | "FEE"
  | "ADJUSTMENT";

// Duplicate action type
export type DuplicateAction = "KEEP_BOTH" | "REPLACE" | "PENDING";

/**
 * Statement import record
 */
export interface StatementImport {
  id: string;
  platform: Platform;
  account_number: string;
  statement_date: string;
  statement_period_start: string | null;
  statement_period_end: string | null;
  parser_version: string;
  import_timestamp: string;
  pdf_stored_until: string | null;
  net_liquidity: number | null;
  total_fees: number | null;
  ending_cash: number | null;
}

/**
 * Individual trade record
 */
export interface Trade {
  id: string;
  import_id: string;
  platform: Platform;
  account_id: string;
  trade_date: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  fees: number;
  trade_type: TradeType | null;
  category: string | null;
  settlement_date: string | null;
  settlement_price: number | null;
  platform_metadata: Record<string, unknown> | null;
}

/**
 * Closed position record
 */
export interface ClosedPosition {
  id: string;
  import_id: string;
  platform: Platform;
  symbol: string;
  entry_date: string | null;
  exit_date: string | null;
  entry_price: number | null;
  exit_price: number | null;
  quantity: number | null;
  gross_pnl: number;
  fees: number | null;
  net_pnl: number | null;
  calculated_pnl: number | null;
  pnl_discrepancy: number | null;
}

/**
 * Cash flow record
 */
export interface CashFlow {
  id: string;
  import_id: string;
  date: string;
  type: CashFlowType;
  amount: number;
  description: string | null;
}

/**
 * Open position record
 */
export interface OpenPosition {
  id: string;
  import_id: string;
  snapshot_date: string;
  symbol: string;
  side: TradeSide | null;
  quantity: number | null;
  cost_basis: number | null;
  current_price: number | null;
  market_value: number | null;
  unrealized_pnl: number | null;
}

/**
 * Schema version record
 */
export interface SchemaVersion {
  version: number;
  applied_at: string;
  description: string | null;
}

/**
 * User settings record
 */
export interface UserSetting {
  key: string;
  value: string;
  updated_at: string;
}

/**
 * Import duplicate record
 */
export interface ImportDuplicate {
  id: string;
  original_import_id: string;
  duplicate_import_id: string;
  detected_at: string;
  user_action: DuplicateAction;
}

// ============================================================================
// VIEW TYPES
// ============================================================================

/**
 * Monthly performance view record
 */
export interface MonthlyPerformance {
  month: string;
  trades_closed: number;
  gross_pnl: number;
  total_fees: number;
  net_pnl: number;
  avg_pnl_per_trade: number;
  winning_trades: number;
  win_rate: number;
}

/**
 * Category performance view record
 */
export interface CategoryPerformance {
  category: string;
  positions_closed: number;
  gross_pnl: number;
  total_fees: number;
  net_pnl: number;
  avg_pnl_per_position: number;
  winning_positions: number;
  win_rate_by_count: number;
  winning_dollar_volume: number;
  total_dollar_volume: number;
  win_rate_by_volume: number;
}

/**
 * Portfolio snapshot view record
 */
export interface PortfolioSnapshot {
  total_deposits: number | null;
  total_withdrawals: number | null;
  realized_pnl: number | null;
  unrealized_pnl: number | null;
  current_net_liquidity: number | null;
}

// ============================================================================
// INPUT TYPES (for mutations)
// ============================================================================

/**
 * Input for creating a statement import
 */
export interface CreateStatementImportInput {
  id?: string;
  platform: Platform;
  account_number: string;
  statement_date: string;
  statement_period_start?: string;
  statement_period_end?: string;
  parser_version: string;
  net_liquidity?: number;
  total_fees?: number;
  ending_cash?: number;
}

/**
 * Input for creating a trade
 */
export interface CreateTradeInput {
  id?: string;
  import_id: string;
  platform: Platform;
  account_id: string;
  trade_date: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  fees?: number;
  trade_type?: TradeType;
  category?: string;
  settlement_date?: string;
  settlement_price?: number;
  platform_metadata?: Record<string, unknown>;
}

/**
 * Input for creating a closed position
 */
export interface CreateClosedPositionInput {
  id?: string;
  import_id: string;
  platform: Platform;
  symbol: string;
  entry_date?: string;
  exit_date?: string;
  entry_price?: number;
  exit_price?: number;
  quantity?: number;
  gross_pnl: number;
  fees?: number;
  net_pnl?: number;
  calculated_pnl?: number;
  pnl_discrepancy?: number;
}

/**
 * Input for creating a cash flow
 */
export interface CreateCashFlowInput {
  id?: string;
  import_id: string;
  date: string;
  type: CashFlowType;
  amount: number;
  description?: string;
}

/**
 * Input for creating an open position
 */
export interface CreateOpenPositionInput {
  id?: string;
  import_id: string;
  snapshot_date: string;
  symbol: string;
  side?: TradeSide;
  quantity?: number;
  cost_basis?: number;
  current_price?: number;
  market_value?: number;
  unrealized_pnl?: number;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Filter for querying trades
 */
export interface TradeFilter {
  dateRange?: {
    start: string;
    end: string;
  };
  categories?: string[];
  symbols?: string[];
  sides?: TradeSide[];
  minPnl?: number;
  maxPnl?: number;
  status?: "OPEN" | "CLOSED" | "ALL";
  importId?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}
