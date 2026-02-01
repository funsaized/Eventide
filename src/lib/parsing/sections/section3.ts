/**
 * Section 3 Parser: Trade Confirmation Summary
 *
 * Parses the Trade Confirmation Summary section which contains
 * aggregated trade information with fee breakdowns. This is an
 * optional section that may not be present in all statements.
 *
 * Key data:
 * - Aggregated trades by symbol + date
 * - Commission and fee breakdowns
 * - Total fees for fee attribution to individual trades
 */

import type { TradeSide } from "../types";
import type { SectionBoundary } from "./boundaries";
import {
  SECTION3_COLUMNS,
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
  parseCurrencyValue,
  parseTradeSide,
  parseLogger,
} from "./parse-helpers";

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single trade confirmation summary row from Section 3
 */
export interface TradeConfirmationSummary {
  /** Trade date (ISO format) */
  tradeDate: string;
  /** Account type (usually "SW") */
  accountType: string;
  /** Total quantity of long contracts */
  totalQtyLong: number;
  /** Total quantity of short contracts */
  totalQtyShort: number;
  /** Position side (YES or NO) */
  subtype: TradeSide;
  /** Full symbol string */
  symbol: string;
  /** Exchange (usually "Kalshi") */
  exchange: string;
  /** Expiration/settlement date */
  expDate: string | null;
  /** Commissions */
  commissions: number;
  /** Exchange fees */
  exchangeFees: number;
  /** NFA fees */
  nfaFees: number;
  /** Total fees (commissions + exchange + NFA) */
  totalFees: number;
  /** Currency code (usually "USD") */
  currency: string;
  /** Human-readable description */
  description: string;
  /** Raw row text for debugging */
  rawText?: string;
}

/**
 * Result of parsing Section 3
 */
export interface Section3ParseResult {
  /** Parsed trade confirmation summaries */
  summaries: TradeConfirmationSummary[];
  /** Number of rows processed */
  rowsProcessed: number;
  /** Number of valid summaries extracted */
  validSummaries: number;
  /** Parsing warnings */
  warnings: string[];
  /** Column layout used */
  layout: ColumnLayout | null;
}

// ============================================================================
// FALLBACK EXTRACTION
// ============================================================================

/**
 * Extract subtype (YES/NO) from row items using pattern matching.
 * Fallback when column-based extraction fails due to split header text
 * or column boundary misalignment.
 */
function extractSubtypeFromRow(row: { text: string }[]): TradeSide | null {
  // Look for standalone YES or NO in the row items
  for (const item of row) {
    const text = item.text.trim().toUpperCase();
    if (text === "YES" || text === "NO") {
      return text as TradeSide;
    }
  }
  return null;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a parsed trade confirmation summary
 */
function isValidSummary(summary: Partial<TradeConfirmationSummary>): boolean {
  // Must have a date
  if (!summary.tradeDate) return false;

  // Must have a symbol
  if (!summary.symbol || summary.symbol.length < 3) return false;

  // Must have a side
  if (!summary.subtype) return false;

  // Must have some quantity
  if ((summary.totalQtyLong ?? 0) === 0 && (summary.totalQtyShort ?? 0) === 0)
    return false;

  return true;
}

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse Section 3 (Trade Confirmation Summary)
 */
export function parseSection3(
  boundary: SectionBoundary,
  pageWidth: number
): Section3ParseResult {
  const items = boundary.items;
  const warnings: string[] = [];
  const summaries: TradeConfirmationSummary[] = [];

  if (items.length === 0) {
    return {
      summaries: [],
      rowsProcessed: 0,
      validSummaries: 0,
      warnings: ["Section 3 has no items"],
      layout: null,
    };
  }

  // Find the header row
  const headerResult = findHeaderRow(items, SECTION3_COLUMNS, pageWidth);
  if (!headerResult) {
    parseLogger.header("S3", { found: false });
    warnings.push("Could not find column headers in Section 3");
    return {
      summaries: [],
      rowsProcessed: 0,
      validSummaries: 0,
      warnings,
      layout: null,
    };
  }

  parseLogger.header("S3", {
    found: true,
    rowIndex: headerResult.headerRowIndex,
    columnCount: headerResult.headerItems.length,
  });

  // Calibrate columns from header
  const layout = calibrateColumns(
    headerResult.headerItems,
    SECTION3_COLUMNS,
    pageWidth
  );

  // Get items after header
  const dataItems = items.slice(
    headerResult.headerRowIndex + headerResult.headerItems.length
  );

  // Group into rows
  const rows = groupIntoRows(dataItems);

  // Track multi-line symbols (same pattern as section2)
  let pendingSummary: Partial<TradeConfirmationSummary> | null = null;
  let rowsProcessed = 0;

  for (const row of rows) {
    rowsProcessed++;

    // Get row text for header detection
    const rowText = row.map((item) => item.text).join(" ");

    // Skip repeated headers on page breaks
    if (isRepeatedHeader(rowText, SECTION3_COLUMNS)) {
      continue;
    }

    // Parse row to column values
    const values = parseRowToColumns(row, layout);

    // Check if this is a data row
    if (!isDataRow(values, SECTION3_COLUMNS)) {
      // Could be a continuation of a wrapped symbol
      if (pendingSummary && values.symbol) {
        pendingSummary.symbol += " " + values.symbol.trim();
      }
      continue;
    }

    // If we have a pending summary, finalize it
    if (pendingSummary && isValidSummary(pendingSummary)) {
      summaries.push(pendingSummary as TradeConfirmationSummary);
      pendingSummary = null;
    }

    // Parse the date
    const tradeDate = parseDateToISO(values.tradeDate ?? "");
    if (!tradeDate) {
      // Not a valid data row - might be continuation of previous symbol
      if (pendingSummary && values.symbol) {
        pendingSummary.symbol += " " + values.symbol.trim();
      }
      continue;
    }

    // Parse side - try column value first, then fallback to pattern extraction
    let subtype = parseTradeSide(values.subtype ?? "");
    if (!subtype) {
      // Fallback: search for YES/NO in row items when column alignment fails
      subtype = extractSubtypeFromRow(row);
    }
    if (!subtype) {
      warnings.push(`Invalid subtype in row: ${rowText.substring(0, 50)}`);
      continue;
    }

    // Parse fees
    const commissions = parseCurrencyValue(values.commissions ?? "") ?? 0;
    const exchangeFees = parseCurrencyValue(values.exchangeFees ?? "") ?? 0;
    const nfaFees = parseCurrencyValue(values.nfaFees ?? "") ?? 0;
    const totalFees =
      parseCurrencyValue(values.totalFees ?? "") ??
      commissions + exchangeFees + nfaFees;

    // Create new summary
    const newSummary: Partial<TradeConfirmationSummary> = {
      tradeDate,
      accountType: values.accountType ?? "SW",
      totalQtyLong: parseQuantity(values.totalQtyLong ?? ""),
      totalQtyShort: parseQuantity(values.totalQtyShort ?? ""),
      subtype,
      symbol: values.symbol?.trim() ?? "",
      exchange: values.exchange ?? "Kalshi",
      expDate: parseDateToISO(values.expDate ?? ""),
      commissions,
      exchangeFees,
      nfaFees,
      totalFees,
      currency: values.currency ?? "USD",
      description: values.description ?? "",
      rawText: rowText,
    };

    // Check if symbol might continue on next row
    if (newSummary.symbol && newSummary.symbol.length < 10) {
      pendingSummary = newSummary;
    } else if (isValidSummary(newSummary)) {
      summaries.push(newSummary as TradeConfirmationSummary);
    } else {
      pendingSummary = newSummary;
    }
  }

  // Don't forget last pending summary
  if (pendingSummary && isValidSummary(pendingSummary)) {
    summaries.push(pendingSummary as TradeConfirmationSummary);
  }

  parseLogger.result("S3", {
    rowsProcessed,
    validCount: summaries.length,
    warnings: warnings.length > 0 ? warnings : undefined,
  });

  return {
    summaries,
    rowsProcessed,
    validSummaries: summaries.length,
    warnings,
    layout,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get total fees for a symbol on a specific date
 */
export function getFeesForSymbolDate(
  summaries: TradeConfirmationSummary[],
  symbol: string,
  date: string
): number {
  const matching = summaries.filter(
    (s) => s.symbol === symbol && s.tradeDate === date
  );
  return matching.reduce((sum, s) => sum + s.totalFees, 0);
}

/**
 * Get total fees for a symbol (across all dates)
 */
export function getTotalFeesForSymbol(
  summaries: TradeConfirmationSummary[],
  symbol: string
): number {
  return summaries
    .filter((s) => s.symbol === symbol)
    .reduce((sum, s) => sum + s.totalFees, 0);
}

/**
 * Get total fees from all summaries
 */
export function getTotalFees(summaries: TradeConfirmationSummary[]): number {
  return summaries.reduce((sum, s) => sum + s.totalFees, 0);
}

/**
 * Group summaries by symbol
 */
export function groupBySymbol(
  summaries: TradeConfirmationSummary[]
): Map<string, TradeConfirmationSummary[]> {
  const groups = new Map<string, TradeConfirmationSummary[]>();

  for (const summary of summaries) {
    const existing = groups.get(summary.symbol) ?? [];
    existing.push(summary);
    groups.set(summary.symbol, existing);
  }

  return groups;
}

/**
 * Group summaries by symbol and date for fee attribution
 */
export function groupBySymbolAndDate(
  summaries: TradeConfirmationSummary[]
): Map<string, TradeConfirmationSummary[]> {
  const groups = new Map<string, TradeConfirmationSummary[]>();

  for (const summary of summaries) {
    const key = `${summary.symbol}|${summary.tradeDate}`;
    const existing = groups.get(key) ?? [];
    existing.push(summary);
    groups.set(key, existing);
  }

  return groups;
}

/**
 * Get fee breakdown totals
 */
export function getFeeBreakdown(summaries: TradeConfirmationSummary[]): {
  commissions: number;
  exchangeFees: number;
  nfaFees: number;
  total: number;
} {
  const commissions = summaries.reduce((sum, s) => sum + s.commissions, 0);
  const exchangeFees = summaries.reduce((sum, s) => sum + s.exchangeFees, 0);
  const nfaFees = summaries.reduce((sum, s) => sum + s.nfaFees, 0);
  const total = summaries.reduce((sum, s) => sum + s.totalFees, 0);

  return { commissions, exchangeFees, nfaFees, total };
}
