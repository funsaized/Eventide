/**
 * Section 7 Parser: Open Positions
 *
 * Parses open (unsettled) positions from the Open Positions section.
 * Tracks unrealized P&L and current market values.
 */

import type { TradeSide, OpenPositionRow } from "../types";
import type { SectionBoundary } from "./boundaries";
import {
  SECTION7_COLUMNS,
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
  parseCurrencyValue,
  parseTradeSide,
  parseLogger,
} from "./parse-helpers";

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single open position row from Section 7
 */
export interface OpenPosition {
  /** Date position was opened */
  dateOpened: string;
  /** Account type (usually "SW") */
  accountType: string;
  /** Quantity of long contracts */
  qtyBuy: number;
  /** Quantity of short contracts */
  qtySell: number;
  /** Position side (YES or NO) */
  subtype: TradeSide;
  /** Full symbol string */
  symbol: string;
  /** Exchange (usually "Kalshi") */
  exchange: string;
  /** Expiration/settlement date */
  expDate: string | null;
  /** Entry trade price (cost basis) */
  tradePrice: number;
  /** Currency code (usually "USD") */
  currency: string;
  /** Current settlement/market price */
  settlementPrice: number | null;
  /** Trade type description */
  tradeType: string;
  /** Human-readable description */
  description: string;
  /** Raw row text for debugging */
  rawText?: string;
}

/**
 * Result of parsing Section 7
 */
export interface Section7ParseResult {
  /** Parsed open positions */
  positions: OpenPosition[];
  /** Number of rows processed */
  rowsProcessed: number;
  /** Number of valid positions extracted */
  validPositions: number;
  /** Parsing warnings */
  warnings: string[];
  /** Column layout used */
  layout: ColumnLayout | null;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a parsed open position
 */
function isValidPosition(position: Partial<OpenPosition>): boolean {
  // Must have a date opened
  if (!position.dateOpened) return false;

  // Must have a symbol
  if (!position.symbol || position.symbol.length < 3) return false;

  // Must have a side
  if (!position.subtype) return false;

  // Must have a non-zero quantity
  if ((position.qtyBuy ?? 0) === 0 && (position.qtySell ?? 0) === 0) return false;

  // Must have a valid trade price
  if (position.tradePrice === null || position.tradePrice === undefined) return false;

  return true;
}

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse Section 7 (Open Positions)
 */
export function parseSection7(
  boundary: SectionBoundary,
  pageWidth: number
): Section7ParseResult {
  const items = boundary.items;
  const warnings: string[] = [];
  const positions: OpenPosition[] = [];

  if (items.length === 0) {
    return {
      positions: [],
      rowsProcessed: 0,
      validPositions: 0,
      warnings: ["Section 7 has no items"],
      layout: null,
    };
  }

  // Find the header row
  const headerResult = findHeaderRow(items, SECTION7_COLUMNS, pageWidth);
  if (!headerResult) {
    parseLogger.header("S7", { found: false });
    warnings.push("Could not find column headers in Section 7");
    return {
      positions: [],
      rowsProcessed: 0,
      validPositions: 0,
      warnings,
      layout: null,
    };
  }

  parseLogger.header("S7", {
    found: true,
    rowIndex: headerResult.headerRowIndex,
    columnCount: headerResult.headerItems.length,
  });

  // Calibrate columns from header
  const layout = calibrateColumns(
    headerResult.headerItems,
    SECTION7_COLUMNS,
    pageWidth
  );

  // Get items after header
  const dataItems = items.slice(
    headerResult.headerRowIndex + headerResult.headerItems.length
  );

  // Group into rows
  const rows = groupIntoRows(dataItems);

  // Track multi-line symbols (same pattern as section2)
  let pendingPosition: Partial<OpenPosition> | null = null;
  let rowsProcessed = 0;

  for (const row of rows) {
    rowsProcessed++;

    // Get row text for header detection
    const rowText = row.map((item) => item.text).join(" ");

    // Skip repeated headers on page breaks
    if (isRepeatedHeader(rowText, SECTION7_COLUMNS)) {
      continue;
    }

    // Parse row to column values
    const values = parseRowToColumns(row, layout);

    // Check if this is a data row
    if (!isDataRow(values, SECTION7_COLUMNS)) {
      // Could be a continuation of a wrapped symbol
      if (pendingPosition && values.symbol) {
        pendingPosition.symbol += " " + values.symbol.trim();
      }
      continue;
    }

    // If we have a pending position, finalize it
    if (pendingPosition && isValidPosition(pendingPosition)) {
      positions.push(pendingPosition as OpenPosition);
      pendingPosition = null;
    }

    // Parse the date opened
    const dateOpened = parseDateToISO(values.dateOpened ?? "");
    if (!dateOpened) {
      // Not a valid data row - might be continuation of previous symbol
      if (pendingPosition && values.symbol) {
        pendingPosition.symbol += " " + values.symbol.trim();
      }
      continue;
    }

    // Parse side
    const subtype = parseTradeSide(values.subtype ?? "");
    if (!subtype) {
      warnings.push(`Invalid subtype in row: ${rowText.substring(0, 50)}`);
      continue;
    }

    // Create new position
    const newPosition: Partial<OpenPosition> = {
      dateOpened,
      accountType: values.accountType ?? "SW",
      qtyBuy: parseQuantity(values.qtyBuy ?? ""),
      qtySell: parseQuantity(values.qtySell ?? ""),
      subtype,
      symbol: values.symbol?.trim() ?? "",
      exchange: values.exchange ?? "Kalshi",
      expDate: parseDateToISO(values.expDate ?? ""),
      tradePrice: parseTradePrice(values.tradePrice ?? "") ?? 0,
      currency: values.currency ?? "USD",
      settlementPrice: parseTradePrice(values.settlementPrice ?? ""),
      tradeType: values.tradeType ?? "event contract",
      description: values.description ?? "",
      rawText: rowText,
    };

    // Check if symbol might continue on next row
    if (newPosition.symbol && newPosition.symbol.length < 10) {
      pendingPosition = newPosition;
    } else if (isValidPosition(newPosition)) {
      positions.push(newPosition as OpenPosition);
    } else {
      pendingPosition = newPosition;
    }
  }

  // Don't forget last pending position
  if (pendingPosition && isValidPosition(pendingPosition)) {
    positions.push(pendingPosition as OpenPosition);
  }

  parseLogger.result("S7", {
    rowsProcessed,
    validCount: positions.length,
    warnings: warnings.length > 0 ? warnings : undefined,
  });

  return {
    positions,
    rowsProcessed,
    validPositions: positions.length,
    warnings,
    layout,
  };
}

// ============================================================================
// POSITION UTILITIES
// ============================================================================

/**
 * Convert OpenPosition to OpenPositionRow for database
 */
export function toOpenPositionRow(
  position: OpenPosition,
  snapshotDate: string
): OpenPositionRow {
  const quantity = position.qtyBuy > 0 ? position.qtyBuy : position.qtySell;
  const currentPrice = position.settlementPrice ?? position.tradePrice;
  const costBasis = position.tradePrice;

  // Calculate unrealized P&L
  // For YES positions: profit if current > entry
  // For NO positions: profit if current < entry
  let unrealizedPnl: number;
  if (position.subtype === "YES") {
    unrealizedPnl = (currentPrice - costBasis) * quantity;
  } else {
    unrealizedPnl = (costBasis - currentPrice) * quantity;
  }

  // Market value is current price * quantity
  const marketValue = currentPrice * quantity;

  return {
    symbol: position.symbol,
    side: position.subtype,
    quantity,
    costBasis,
    currentPrice,
    marketValue,
    unrealizedPnl,
  };
}

/**
 * Get total quantity of open positions
 */
export function getTotalOpenQuantity(positions: OpenPosition[]): number {
  return positions.reduce((sum, p) => sum + (p.qtyBuy || p.qtySell), 0);
}

/**
 * Get total unrealized P&L across all positions
 */
export function getTotalUnrealizedPnl(positions: OpenPosition[]): number {
  return positions.reduce((sum, p) => {
    const row = toOpenPositionRow(p, "");
    return sum + row.unrealizedPnl;
  }, 0);
}

/**
 * Get total market value of open positions
 */
export function getTotalMarketValue(positions: OpenPosition[]): number {
  return positions.reduce((sum, p) => {
    const row = toOpenPositionRow(p, "");
    return sum + row.marketValue;
  }, 0);
}

/**
 * Get the effective quantity for a position
 */
export function getPositionQuantity(position: OpenPosition): number {
  return position.qtyBuy > 0 ? position.qtyBuy : position.qtySell;
}

/**
 * Filter positions by symbol pattern
 */
export function filterBySymbol(
  positions: OpenPosition[],
  pattern: RegExp
): OpenPosition[] {
  return positions.filter((p) => pattern.test(p.symbol));
}

/**
 * Filter positions by side
 */
export function filterBySide(
  positions: OpenPosition[],
  side: TradeSide
): OpenPosition[] {
  return positions.filter((p) => p.subtype === side);
}

/**
 * Group positions by symbol
 */
export function groupBySymbol(
  positions: OpenPosition[]
): Map<string, OpenPosition[]> {
  const groups = new Map<string, OpenPosition[]>();

  for (const position of positions) {
    const existing = groups.get(position.symbol) ?? [];
    existing.push(position);
    groups.set(position.symbol, existing);
  }

  return groups;
}

/**
 * Check if a position is expiring soon (within N days)
 */
export function isExpiringSoon(
  position: OpenPosition,
  daysThreshold: number = 7
): boolean {
  if (!position.expDate) return false;

  const expDate = new Date(position.expDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diffDays >= 0 && diffDays <= daysThreshold;
}
