/**
 * Section 4 Parser: Purchase and Sale
 *
 * Parses the Purchase and Sale section which includes the complete
 * position lifecycle, including trades opened in prior statement periods.
 *
 * KEY INSIGHT: Section 4 may contain trades from prior months that settled
 * this month. Cross-reference with Section 2 to avoid double-counting.
 */

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
import type { TradeConfirmation } from "./section2";
import {
  parseDateToISO,
  parseQuantity,
  parseTradePrice,
  parseTradeSide,
  parseTradeType,
  parseLogger,
} from "./parse-helpers";

// ============================================================================
// TYPES
// ============================================================================

/**
 * A trade from Section 4 (Purchase and Sale)
 * Extends TradeConfirmation with additional metadata for deduplication
 */
export interface PurchaseSaleTrade extends TradeConfirmation {
  /** Whether this trade was opened in a prior statement period */
  isPriorPeriod: boolean;
}

/**
 * Result of parsing Section 4
 */
export interface Section4ParseResult {
  /** All parsed trades */
  trades: PurchaseSaleTrade[];
  /** Trades from current period (also in Section 2) */
  currentPeriodTrades: PurchaseSaleTrade[];
  /** Trades from prior periods (NOT in Section 2) */
  priorPeriodTrades: PurchaseSaleTrade[];
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
function isValidTrade(trade: Partial<PurchaseSaleTrade>): boolean {
  if (!trade.tradeDate) return false;
  if (!trade.symbol || trade.symbol.length < 3) return false;
  if (!trade.subtype) return false;
  if ((trade.qtyLong ?? 0) === 0 && (trade.qtyShort ?? 0) === 0) return false;
  if (trade.tradePrice === null || trade.tradePrice === undefined) return false;
  return true;
}

/**
 * Check if a trade date is within the statement period
 */
function isWithinStatementPeriod(
  tradeDate: string,
  periodStart: string,
  periodEnd: string
): boolean {
  return tradeDate >= periodStart && tradeDate <= periodEnd;
}

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse Section 4 (Purchase and Sale)
 */
export function parseSection4(
  boundary: SectionBoundary,
  pageWidth: number,
  statementPeriodStart?: string,
  statementPeriodEnd?: string
): Section4ParseResult {
  const items = boundary.items;
  const warnings: string[] = [];
  const trades: PurchaseSaleTrade[] = [];

  if (items.length === 0) {
    return {
      trades: [],
      currentPeriodTrades: [],
      priorPeriodTrades: [],
      rowsProcessed: 0,
      validTrades: 0,
      warnings: ["Section 4 has no items"],
      layout: null,
    };
  }

  // Find the header row - Section 4 uses same structure as Section 2
  const headerResult = findHeaderRow(items, SECTION2_COLUMNS, pageWidth);
  if (!headerResult) {
    parseLogger.header("S4", { found: false });
    warnings.push("Could not find column headers in Section 4");
    return {
      trades: [],
      currentPeriodTrades: [],
      priorPeriodTrades: [],
      rowsProcessed: 0,
      validTrades: 0,
      warnings,
      layout: null,
    };
  }

  parseLogger.header("S4", {
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
  let pendingTrade: Partial<PurchaseSaleTrade> | null = null;
  let rowsProcessed = 0;

  for (const row of rows) {
    rowsProcessed++;

    const rowText = row.map((item) => item.text).join(" ");

    // Skip repeated headers
    if (isRepeatedHeader(rowText, SECTION2_COLUMNS)) {
      continue;
    }

    // Parse row to column values
    const values = parseRowToColumns(row, layout);

    // Check if this is a data row
    if (!isDataRow(values, SECTION2_COLUMNS)) {
      if (pendingTrade && values.symbol) {
        pendingTrade.symbol += " " + values.symbol.trim();
      }
      continue;
    }

    // Finalize pending trade
    if (pendingTrade && isValidTrade(pendingTrade)) {
      trades.push(pendingTrade as PurchaseSaleTrade);
      pendingTrade = null;
    }

    // Parse trade date
    const tradeDate = parseDateToISO(values.tradeDate ?? "");
    if (!tradeDate) {
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

    // Determine if this is a prior period trade
    const isPriorPeriod =
      statementPeriodStart && statementPeriodEnd
        ? !isWithinStatementPeriod(tradeDate, statementPeriodStart, statementPeriodEnd)
        : false;

    // Create new trade
    const newTrade: Partial<PurchaseSaleTrade> = {
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
      source: "section4",
      isPriorPeriod,
      rawText: rowText,
    };

    // Handle potential symbol wrapping
    if (newTrade.symbol && newTrade.symbol.length < 10) {
      pendingTrade = newTrade;
    } else if (isValidTrade(newTrade)) {
      trades.push(newTrade as PurchaseSaleTrade);
    } else {
      pendingTrade = newTrade;
    }
  }

  // Don't forget last pending trade
  if (pendingTrade && isValidTrade(pendingTrade)) {
    trades.push(pendingTrade as PurchaseSaleTrade);
  }

  // Separate current and prior period trades
  const currentPeriodTrades = trades.filter((t) => !t.isPriorPeriod);
  const priorPeriodTrades = trades.filter((t) => t.isPriorPeriod);

  parseLogger.result("S4", {
    rowsProcessed,
    validCount: trades.length,
    warnings: warnings.length > 0 ? warnings : undefined,
  });

  parseLogger.debug("S4", `current=${currentPeriodTrades.length} prior=${priorPeriodTrades.length}`);

  return {
    trades,
    currentPeriodTrades,
    priorPeriodTrades,
    rowsProcessed,
    validTrades: trades.length,
    warnings,
    layout,
  };
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

/**
 * Compare two trades to see if they are duplicates
 */
export function areTradesDuplicate(
  trade1: TradeConfirmation,
  trade2: TradeConfirmation
): boolean {
  return (
    trade1.tradeDate === trade2.tradeDate &&
    trade1.symbol === trade2.symbol &&
    trade1.subtype === trade2.subtype &&
    trade1.tradePrice === trade2.tradePrice &&
    trade1.qtyLong === trade2.qtyLong &&
    trade1.qtyShort === trade2.qtyShort &&
    trade1.tradeType === trade2.tradeType
  );
}

/**
 * Merge Section 2 and Section 4 trades, removing duplicates
 *
 * Section 2 contains current month trades only.
 * Section 4 contains all trades that settled this month (including prior month trades).
 *
 * Strategy:
 * - Keep all Section 2 trades (they're the source of truth for current month)
 * - Add Section 4 trades that don't appear in Section 2 (prior period trades)
 */
export function mergeTradesWithDeduplication(
  section2Trades: TradeConfirmation[],
  section4Trades: PurchaseSaleTrade[]
): {
  mergedTrades: TradeConfirmation[];
  duplicatesRemoved: number;
} {
  const mergedTrades: TradeConfirmation[] = [...section2Trades];
  let duplicatesRemoved = 0;

  for (const s4Trade of section4Trades) {
    const isDuplicate = section2Trades.some((s2Trade) =>
      areTradesDuplicate(s2Trade, s4Trade)
    );

    if (isDuplicate) {
      duplicatesRemoved++;
    } else {
      mergedTrades.push(s4Trade);
    }
  }

  parseLogger.dedup({
    section2Count: section2Trades.length,
    section4Count: section4Trades.length,
    duplicatesRemoved,
    finalCount: mergedTrades.length,
  });

  return {
    mergedTrades,
    duplicatesRemoved,
  };
}

/**
 * Get unique trades by combining Section 2 and Section 4
 * Prioritizes Section 2 for current-period trades
 */
export function getUniqueTradesFromSections(
  section2Trades: TradeConfirmation[],
  section4Result: Section4ParseResult
): TradeConfirmation[] {
  return [...section2Trades, ...section4Result.priorPeriodTrades];
}
