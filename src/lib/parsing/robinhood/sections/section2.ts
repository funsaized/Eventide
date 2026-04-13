/**
 * Section 2 Parser: Monthly Trade Confirmations
 *
 * Parses individual trade executions from the Monthly Trade Confirmations section.
 * Handles multi-page tables, wrapped symbols, and scientific notation prices.
 */

import type { TradeSide } from "../../types";
import type { SectionBoundary } from "./boundaries";
import {
  SECTION2_COLUMNS,
  findHeaderRow,
  calibrateColumns,
  groupIntoRows,
  parseRowToColumns,
  isDataRow,
  isRepeatedHeader,
  type ColumnLayout,
} from "./columns";
import {
  parseDateToISO,
  parseQuantity,
  parseTradePrice,
  parseTradeSide,
  parseTradeType,
  parseLogger,
  type TradeType,
} from "./parse-helpers";

// ============================================================================
// TYPES
// ============================================================================

// Re-export TradeType for consumers
export type { TradeType } from "./parse-helpers";

/**
 * A single trade row extracted from Section 2
 */
export interface TradeConfirmation {
  /** Trade date (ISO format YYYY-MM-DD) */
  tradeDate: string;
  /** Account type (usually "SW" for swaps) */
  accountType: string;
  /** Quantity of long contracts */
  qtyLong: number;
  /** Quantity of short contracts */
  qtyShort: number;
  /** Trade side (YES or NO) */
  subtype: TradeSide;
  /** Full symbol string */
  symbol: string;
  /** Contract year */
  contractYear: number | null;
  /** Exchange (usually "Kalshi") */
  exchange: string;
  /** Expiration/settlement date */
  expDate: string | null;
  /** Trade price (0-1 range for binary options) */
  tradePrice: number;
  /** Currency code (usually "USD") */
  currency: string;
  /** Trade or Final Settlement */
  tradeType: TradeType;
  /** Human-readable description */
  description: string;
  /** Source section for deduplication */
  source: "section2" | "section4";
  /** Raw row text for debugging */
  rawText?: string;
}

/**
 * Result of parsing Section 2
 */
export interface Section2ParseResult {
  /** Parsed trades */
  trades: TradeConfirmation[];
  /** Number of rows processed */
  rowsProcessed: number;
  /** Number of valid trades extracted */
  validTrades: number;
  /** Parsing warnings */
  warnings: string[];
  /** Column layout used */
  layout: ColumnLayout | null;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a parsed trade
 */
function isValidTrade(trade: Partial<TradeConfirmation>): boolean {
  if (!trade.tradeDate) return false;
  if (!trade.symbol || trade.symbol.length < 3) return false;
  if (!trade.subtype) return false;
  if ((trade.qtyLong ?? 0) === 0 && (trade.qtyShort ?? 0) === 0) return false;
  if (trade.tradePrice === null || trade.tradePrice === undefined) return false;
  return true;
}

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse Section 2 (Monthly Trade Confirmations)
 */
export function parseSection2(
  boundary: SectionBoundary,
  pageWidth: number
): Section2ParseResult {
  const items = boundary.items;
  const warnings: string[] = [];
  const trades: TradeConfirmation[] = [];

  if (items.length === 0) {
    return {
      trades: [],
      rowsProcessed: 0,
      validTrades: 0,
      warnings: ["Section 2 has no items"],
      layout: null,
    };
  }

  // Find the header row
  const headerResult = findHeaderRow(items, SECTION2_COLUMNS, pageWidth);
  if (!headerResult) {
    parseLogger.header("S2", { found: false });
    warnings.push("Could not find column headers in Section 2");
    return {
      trades: [],
      rowsProcessed: 0,
      validTrades: 0,
      warnings,
      layout: null,
    };
  }

  parseLogger.header("S2", {
    found: true,
    rowIndex: headerResult.headerRowIndex,
    columnCount: headerResult.headerItems.length,
  });

  // Calibrate columns from header
  const layout = calibrateColumns(
    headerResult.headerItems,
    SECTION2_COLUMNS,
    pageWidth
  );

  // Get items after header
  const dataItems = items.slice(
    headerResult.headerRowIndex + headerResult.headerItems.length
  );

  // Group into rows
  const rows = groupIntoRows(dataItems);

  // Track multi-line symbols
  let pendingTrade: Partial<TradeConfirmation> | null = null;
  let rowsProcessed = 0;

  for (const row of rows) {
    rowsProcessed++;

    // Get row text for header detection
    const rowText = row.map((item) => item.text).join(" ");

    // Skip repeated headers on page breaks
    if (isRepeatedHeader(rowText, SECTION2_COLUMNS)) {
      continue;
    }

    // Parse row to column values
    const values = parseRowToColumns(row, layout);

    // Check if this is a data row
    if (!isDataRow(values, SECTION2_COLUMNS)) {
      // Could be a continuation of a wrapped symbol
      if (pendingTrade && values.symbol) {
        pendingTrade.symbol += " " + values.symbol.trim();
      }
      continue;
    }

    // If we have a pending trade, finalize it
    if (pendingTrade && isValidTrade(pendingTrade)) {
      trades.push(pendingTrade as TradeConfirmation);
      pendingTrade = null;
    }

    // Parse the trade date
    const tradeDate = parseDateToISO(values.tradeDate ?? "");
    if (!tradeDate) {
      // Not a valid data row - might be continuation of previous symbol
      if (pendingTrade && values.symbol) {
        pendingTrade.symbol += " " + values.symbol.trim();
      }
      continue;
    }

    // Parse side
    const subtype = parseTradeSide(values.subtype ?? "");
    if (!subtype) {
      warnings.push(`Invalid subtype in row: ${rowText.substring(0, 50)}`);
      continue;
    }

    // Create new trade
    const newTrade: Partial<TradeConfirmation> = {
      tradeDate,
      accountType: values.accountType ?? "SW",
      qtyLong: parseQuantity(values.qtyLong ?? ""),
      qtyShort: parseQuantity(values.qtyShort ?? ""),
      subtype,
      symbol: values.symbol?.trim() ?? "",
      contractYear: values.contractYear ? parseInt(values.contractYear) : null,
      exchange: values.exchange ?? "Kalshi",
      expDate: parseDateToISO(values.expDate ?? ""),
      tradePrice: parseTradePrice(values.tradePrice ?? "") ?? 0,
      currency: values.currency ?? "USD",
      tradeType: parseTradeType(values.tradeType ?? ""),
      description: values.description ?? "",
      source: "section2",
      rawText: rowText,
    };

    // Check if symbol might continue on next row (symbols can be very long and wrap)
    if (newTrade.symbol && newTrade.symbol.length < 10) {
      pendingTrade = newTrade;
    } else if (isValidTrade(newTrade)) {
      trades.push(newTrade as TradeConfirmation);
    } else {
      pendingTrade = newTrade;
    }
  }

  // Don't forget last pending trade
  if (pendingTrade && isValidTrade(pendingTrade)) {
    trades.push(pendingTrade as TradeConfirmation);
  }

  parseLogger.result("S2", {
    rowsProcessed,
    validCount: trades.length,
    warnings: warnings.length > 0 ? warnings : undefined,
  });

  return {
    trades,
    rowsProcessed,
    validTrades: trades.length,
    warnings,
    layout,
  };
}

// ============================================================================
// TRADE UTILITIES
// ============================================================================

/**
 * Get the effective quantity for a trade (long or short)
 */
export function getTradeQuantity(trade: TradeConfirmation): number {
  return trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort;
}

/**
 * Determine if a trade is an opening trade
 */
export function isOpeningTrade(trade: TradeConfirmation): boolean {
  return trade.tradeType === "Trade";
}

/**
 * Determine if a trade is a settlement
 */
export function isSettlement(trade: TradeConfirmation): boolean {
  return trade.tradeType === "Final Settlement";
}

/**
 * Get settlement outcome from a Final Settlement trade
 * Returns 0 (NO won), 1 (YES won), or the settlement price
 */
export function getSettlementOutcome(trade: TradeConfirmation): number | null {
  if (!isSettlement(trade)) return null;
  return trade.tradePrice ?? null;
}

/**
 * Check if two trades are for the same position
 */
export function isSamePosition(
  trade1: TradeConfirmation,
  trade2: TradeConfirmation
): boolean {
  return (
    trade1.symbol === trade2.symbol &&
    trade1.subtype === trade2.subtype &&
    trade1.expDate === trade2.expDate
  );
}

/**
 * Filter trades by type
 */
export function filterByTradeType(
  trades: TradeConfirmation[],
  type: TradeType
): TradeConfirmation[] {
  return trades.filter((t) => t.tradeType === type);
}

/**
 * Filter trades by symbol pattern
 */
export function filterBySymbol(
  trades: TradeConfirmation[],
  pattern: RegExp
): TradeConfirmation[] {
  return trades.filter((t) => pattern.test(t.symbol));
}

/**
 * Group trades by symbol
 */
export function groupTradesBySymbol(
  trades: TradeConfirmation[]
): Map<string, TradeConfirmation[]> {
  const groups = new Map<string, TradeConfirmation[]>();

  for (const trade of trades) {
    const existing = groups.get(trade.symbol) ?? [];
    existing.push(trade);
    groups.set(trade.symbol, existing);
  }

  return groups;
}
