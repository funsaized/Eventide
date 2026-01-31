/**
 * Section 5 Parser: Purchase and Sale Summary
 *
 * Parses the Purchase and Sale Summary section which provides the
 * AUTHORITATIVE SOURCE OF TRUTH for P&L figures.
 *
 * KEY INSIGHT: This section shows TWO rows per resolved position:
 * - YES row: Shows the cost basis (negative if you bought YES)
 * - NO row: Shows the settlement proceeds (positive if YES won)
 * Net P&L = YES row + NO row for the same symbol/expDate
 */

import type { TextItem, TradeSide } from "../types";
import { mergeLineText } from "../pdf-loader";
import type { SectionBoundary } from "./boundaries";
import {
  SECTION5_COLUMNS,
  findHeaderRow,
  calibrateColumns,
  groupIntoRows,
  parseRowToColumns,
  isDataRow,
  isRepeatedHeader,
  type ColumnLayout,
} from "./columns";

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single row from the Purchase and Sale Summary
 */
export interface PurchaseSaleSummaryRow {
  /** Trade date (month of activity) */
  tradeDate: string;
  /** Account type (usually "SW") */
  accountType: string;
  /** Total quantity long */
  totalQtyLong: number;
  /** Total quantity short */
  totalQtyShort: number;
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
  /** Gross P&L - SOURCE OF TRUTH */
  grossPnl: number;
  /** Currency code */
  currency: string;
  /** Human-readable description */
  description: string;
}

/**
 * Paired YES/NO rows for a position with calculated net P&L
 */
export interface PairedPosition {
  /** Symbol */
  symbol: string;
  /** Expiration date */
  expDate: string | null;
  /** YES side row (if present) */
  yesRow: PurchaseSaleSummaryRow | null;
  /** NO side row (if present) */
  noRow: PurchaseSaleSummaryRow | null;
  /** Net P&L (sum of YES and NO gross P&L) */
  netPnl: number;
  /** Total quantity traded */
  totalQuantity: number;
  /** Description (from either row) */
  description: string;
}

/**
 * Result of parsing Section 5
 */
export interface Section5ParseResult {
  /** All parsed summary rows */
  rows: PurchaseSaleSummaryRow[];
  /** Paired positions with net P&L */
  pairedPositions: PairedPosition[];
  /** Total gross P&L from all positions */
  totalGrossPnl: number;
  /** Number of rows processed */
  rowsProcessed: number;
  /** Number of valid rows extracted */
  validRows: number;
  /** Parsing warnings */
  warnings: string[];
  /** Column layout used */
  layout: ColumnLayout | null;
}

// ============================================================================
// PARSING LOGIC
// ============================================================================

/**
 * Parse a date string to ISO format
 */
function parseDateToISO(dateStr: string): string | null {
  if (!dateStr) return null;

  const mdyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return isoMatch[0];
  }

  return null;
}

/**
 * Parse a currency/P&L value (handles negatives and parentheses)
 */
function parseCurrencyValue(value: string): number | null {
  if (!value) return null;

  // Remove currency symbols and whitespace
  let cleaned = value.trim().replace(/[$\s]/g, "");

  // Handle parentheses for negative values: (123.45) = -123.45
  const isNegative = cleaned.includes("(") || cleaned.startsWith("-");
  cleaned = cleaned.replace(/[(),-]/g, "");

  // Remove thousand separators
  cleaned = cleaned.replace(/,/g, "");

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return null;

  return isNegative ? -parsed : parsed;
}

/**
 * Parse a quantity value
 */
function parseQuantity(qtyStr: string): number {
  if (!qtyStr || qtyStr.trim() === "") return 0;
  const cleaned = qtyStr.replace(/[,\s]/g, "");
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse trade side (subtype)
 */
function parseTradeSide(subtypeStr: string): TradeSide | null {
  if (!subtypeStr) return null;
  const upper = subtypeStr.toUpperCase().trim();
  if (upper === "YES" || upper === "Y") return "YES";
  if (upper === "NO" || upper === "N") return "NO";
  return null;
}

/**
 * Validate a parsed summary row
 */
function isValidRow(row: Partial<PurchaseSaleSummaryRow>): boolean {
  if (!row.symbol || row.symbol.length < 3) return false;
  if (!row.subtype) return false;
  if (row.grossPnl === null || row.grossPnl === undefined) return false;
  return true;
}

/**
 * Parse Section 5 (Purchase and Sale Summary)
 */
export function parseSection5(
  boundary: SectionBoundary,
  pageWidth: number
): Section5ParseResult {
  const items = boundary.items;
  const warnings: string[] = [];
  const rows: PurchaseSaleSummaryRow[] = [];

  if (items.length === 0) {
    return {
      rows: [],
      pairedPositions: [],
      totalGrossPnl: 0,
      rowsProcessed: 0,
      validRows: 0,
      warnings: ["Section 5 has no items"],
      layout: null,
    };
  }

  // Find the header row
  const headerResult = findHeaderRow(items, SECTION5_COLUMNS, pageWidth);
  if (!headerResult) {
    warnings.push("Could not find column headers in Section 5");
    return {
      rows: [],
      pairedPositions: [],
      totalGrossPnl: 0,
      rowsProcessed: 0,
      validRows: 0,
      warnings,
      layout: null,
    };
  }

  // Calibrate columns from header
  const layout = calibrateColumns(
    headerResult.headerItems,
    SECTION5_COLUMNS,
    pageWidth
  );

  // Get items after header
  const dataItems = items.slice(
    headerResult.headerRowIndex + headerResult.headerItems.length
  );

  // Group into rows
  const textRows = groupIntoRows(dataItems);

  let pendingRow: Partial<PurchaseSaleSummaryRow> | null = null;
  let rowsProcessed = 0;

  for (const row of textRows) {
    rowsProcessed++;

    const rowText = row.map((item) => item.text).join(" ");

    // Skip repeated headers
    if (isRepeatedHeader(rowText, SECTION5_COLUMNS)) {
      continue;
    }

    // Parse row to column values
    const values = parseRowToColumns(row, layout);

    // Check if this is a data row
    if (!isDataRow(values, SECTION5_COLUMNS)) {
      // Could be continuation of wrapped symbol
      if (pendingRow && values.symbol) {
        pendingRow.symbol += " " + values.symbol.trim();
      }
      continue;
    }

    // Finalize pending row
    if (pendingRow && isValidRow(pendingRow)) {
      rows.push(pendingRow as PurchaseSaleSummaryRow);
      pendingRow = null;
    }

    // Parse trade date
    const tradeDate = parseDateToISO(values.tradeDate ?? "");

    // Parse side
    const subtype = parseTradeSide(values.subtype ?? "");
    if (!subtype) {
      // Not a valid data row
      if (pendingRow && values.symbol) {
        pendingRow.symbol += " " + values.symbol.trim();
      }
      continue;
    }

    // Parse gross P&L
    const grossPnl = parseCurrencyValue(values.grossPnl ?? "");
    if (grossPnl === null) {
      warnings.push(`Invalid P&L value in row: ${rowText.substring(0, 50)}`);
      continue;
    }

    // Create new row
    const newRow: Partial<PurchaseSaleSummaryRow> = {
      tradeDate: tradeDate ?? "",
      accountType: values.accountType ?? "SW",
      totalQtyLong: parseQuantity(values.totalQtyLong ?? ""),
      totalQtyShort: parseQuantity(values.totalQtyShort ?? ""),
      subtype,
      symbol: values.symbol?.trim() ?? "",
      contractYear: values.contractYear ? parseInt(values.contractYear) : null,
      exchange: values.exchange ?? "Kalshi",
      expDate: parseDateToISO(values.expDate ?? ""),
      grossPnl,
      currency: values.currency ?? "USD",
      description: values.description ?? "",
    };

    // Handle potential symbol wrapping
    if (newRow.symbol && newRow.symbol.length < 10) {
      pendingRow = newRow;
    } else if (isValidRow(newRow)) {
      rows.push(newRow as PurchaseSaleSummaryRow);
    } else {
      pendingRow = newRow;
    }
  }

  // Don't forget last pending row
  if (pendingRow && isValidRow(pendingRow)) {
    rows.push(pendingRow as PurchaseSaleSummaryRow);
  }

  // Pair YES/NO rows for same position
  const pairedPositions = pairPositionRows(rows);

  // Calculate total gross P&L
  const totalGrossPnl = rows.reduce((sum, row) => sum + row.grossPnl, 0);

  return {
    rows,
    pairedPositions,
    totalGrossPnl,
    rowsProcessed,
    validRows: rows.length,
    warnings,
    layout,
  };
}

// ============================================================================
// POSITION PAIRING
// ============================================================================

/**
 * Create a unique key for a position (symbol + expDate)
 */
function getPositionKey(row: PurchaseSaleSummaryRow): string {
  return `${row.symbol}_${row.expDate ?? ""}`;
}

/**
 * Pair YES/NO rows for the same position
 */
export function pairPositionRows(
  rows: PurchaseSaleSummaryRow[]
): PairedPosition[] {
  // Group by position key
  const positionMap = new Map<
    string,
    { yesRow: PurchaseSaleSummaryRow | null; noRow: PurchaseSaleSummaryRow | null }
  >();

  for (const row of rows) {
    const key = getPositionKey(row);
    const existing = positionMap.get(key) ?? { yesRow: null, noRow: null };

    if (row.subtype === "YES") {
      existing.yesRow = row;
    } else {
      existing.noRow = row;
    }

    positionMap.set(key, existing);
  }

  // Convert to PairedPosition array
  const pairedPositions: PairedPosition[] = [];

  for (const [key, { yesRow, noRow }] of positionMap) {
    const symbol = yesRow?.symbol ?? noRow?.symbol ?? key.split("_")[0];
    const expDate = yesRow?.expDate ?? noRow?.expDate ?? null;

    // Calculate net P&L (sum of YES and NO gross P&L)
    const yesPnl = yesRow?.grossPnl ?? 0;
    const noPnl = noRow?.grossPnl ?? 0;
    const netPnl = yesPnl + noPnl;

    // Calculate total quantity
    const yesQty = (yesRow?.totalQtyLong ?? 0) + (yesRow?.totalQtyShort ?? 0);
    const noQty = (noRow?.totalQtyLong ?? 0) + (noRow?.totalQtyShort ?? 0);
    const totalQuantity = Math.max(yesQty, noQty);

    // Get description
    const description = yesRow?.description ?? noRow?.description ?? "";

    pairedPositions.push({
      symbol,
      expDate,
      yesRow,
      noRow,
      netPnl,
      totalQuantity,
      description,
    });
  }

  return pairedPositions;
}

// ============================================================================
// P&L UTILITIES
// ============================================================================

/**
 * Get P&L by symbol from paired positions
 */
export function getPnlBySymbol(
  pairedPositions: PairedPosition[]
): Map<string, number> {
  const pnlMap = new Map<string, number>();

  for (const position of pairedPositions) {
    const existing = pnlMap.get(position.symbol) ?? 0;
    pnlMap.set(position.symbol, existing + position.netPnl);
  }

  return pnlMap;
}

/**
 * Get total P&L from paired positions
 */
export function getTotalPnl(pairedPositions: PairedPosition[]): number {
  return pairedPositions.reduce((sum, pos) => sum + pos.netPnl, 0);
}

/**
 * Get winning positions (net P&L > 0)
 */
export function getWinningPositions(
  pairedPositions: PairedPosition[]
): PairedPosition[] {
  return pairedPositions.filter((pos) => pos.netPnl > 0);
}

/**
 * Get losing positions (net P&L < 0)
 */
export function getLosingPositions(
  pairedPositions: PairedPosition[]
): PairedPosition[] {
  return pairedPositions.filter((pos) => pos.netPnl < 0);
}

/**
 * Calculate win rate from paired positions
 */
export function calculateWinRate(pairedPositions: PairedPosition[]): number {
  if (pairedPositions.length === 0) return 0;

  const winners = getWinningPositions(pairedPositions).length;
  return winners / pairedPositions.length;
}

/**
 * Validate calculated P&L against Section 5 reported P&L
 *
 * @param calculatedPnl Our FIFO-calculated P&L for a symbol
 * @param section5Pnl Section 5's reported P&L (source of truth)
 * @param tolerance Acceptable discrepancy (default ±$0.01)
 */
export function validatePnl(
  calculatedPnl: number,
  section5Pnl: number,
  tolerance: number = 0.01
): { isValid: boolean; discrepancy: number } {
  const discrepancy = Math.abs(calculatedPnl - section5Pnl);
  return {
    isValid: discrepancy <= tolerance,
    discrepancy,
  };
}

/**
 * Find Section 5 P&L for a given symbol and side
 */
export function findSection5Pnl(
  rows: PurchaseSaleSummaryRow[],
  symbol: string,
  subtype: TradeSide
): number | null {
  const row = rows.find((r) => r.symbol === symbol && r.subtype === subtype);
  return row?.grossPnl ?? null;
}

/**
 * Find paired position for a given symbol
 */
export function findPairedPosition(
  pairedPositions: PairedPosition[],
  symbol: string
): PairedPosition | null {
  return pairedPositions.find((p) => p.symbol === symbol) ?? null;
}
