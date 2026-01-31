/**
 * Section Parse Helpers
 *
 * Shared parsing utilities for section parsers.
 * Consolidates common functions to eliminate duplication.
 */

import type { TradeSide } from "../types";
import { parseDate } from "../utils";

// ============================================================================
// DEBUG LOGGING
// ============================================================================

/** Debug log levels */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Whether debug logging is enabled (can be toggled) */
let debugEnabled = process.env.NODE_ENV === "development";

/**
 * Enable or disable debug logging
 */
export function setDebugLogging(enabled: boolean): void {
  debugEnabled = enabled;
}

/**
 * Structured debug logger for parsing operations
 */
export const parseLogger = {
  /** Log section boundary detection */
  section(sectionId: string, data: {
    startPage: number;
    endPage: number | null;
    itemCount: number;
  }): void {
    if (!debugEnabled) return;
    console.log(`[PARSE:${sectionId}] pages=${data.startPage}-${data.endPage ?? "?"} items=${data.itemCount}`);
  },

  /** Log header detection */
  header(sectionId: string, data: {
    found: boolean;
    rowIndex?: number;
    columnCount?: number;
  }): void {
    if (!debugEnabled) return;
    if (data.found) {
      console.log(`[PARSE:${sectionId}] Header found at row ${data.rowIndex}, ${data.columnCount} columns`);
    } else {
      console.log(`[PARSE:${sectionId}] Header NOT found`);
    }
  },

  /** Log parsing results */
  result(sectionId: string, data: {
    rowsProcessed: number;
    validCount: number;
    warnings?: string[];
  }): void {
    if (!debugEnabled) return;
    console.log(`[PARSE:${sectionId}] rows=${data.rowsProcessed} valid=${data.validCount}`);
    if (data.warnings && data.warnings.length > 0) {
      console.log(`[PARSE:${sectionId}] warnings:`, data.warnings);
    }
  },

  /** Log deduplication */
  dedup(data: {
    section2Count: number;
    section4Count: number;
    duplicatesRemoved: number;
    finalCount: number;
  }): void {
    if (!debugEnabled) return;
    console.log(`[PARSE:DEDUP] S2=${data.section2Count} S4=${data.section4Count} dups=${data.duplicatesRemoved} final=${data.finalCount}`);
  },

  /** Log statement period */
  period(data: {
    statementDate: string;
    periodStart: string;
    periodEnd: string;
  }): void {
    if (!debugEnabled) return;
    console.log(`[PARSE:PERIOD] date=${data.statementDate} range=${data.periodStart} to ${data.periodEnd}`);
  },

  /** Generic debug message */
  debug(context: string, message: string, data?: unknown): void {
    if (!debugEnabled) return;
    if (data !== undefined) {
      console.log(`[PARSE:${context}] ${message}`, data);
    } else {
      console.log(`[PARSE:${context}] ${message}`);
    }
  },

  /** Warning message */
  warn(context: string, message: string): void {
    console.warn(`[PARSE:${context}] WARNING: ${message}`);
  },
};

// ============================================================================
// DATE PARSING
// ============================================================================

/**
 * Parse a date string to ISO format (YYYY-MM-DD)
 * Delegates to the date-fns based parseDate in utils.ts
 */
export function parseDateToISO(dateStr: string): string | null {
  if (!dateStr) return null;
  return parseDate(dateStr);
}

// ============================================================================
// QUANTITY & NUMBER PARSING
// ============================================================================

/**
 * Parse a quantity value (integer)
 * Handles comma separators and whitespace
 */
export function parseQuantity(qtyStr: string): number {
  if (!qtyStr || qtyStr.trim() === "") return 0;
  const cleaned = qtyStr.replace(/[,\s]/g, "");
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a price value, handling scientific notation
 * Examples: "0.65", "0E-8" (= 0), "1.00000000"
 */
export function parseTradePrice(priceStr: string): number | null {
  if (!priceStr) return null;

  const cleaned = priceStr.trim().replace(/[$,\s]/g, "");

  // Handle scientific notation (e.g., "0E-8" = 0)
  if (/^[\d.]+E[+-]?\d+$/i.test(cleaned)) {
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  // Handle regular decimal
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse a currency/P&L value (handles negatives and parentheses)
 * Examples: "$123.45", "(50.00)" = -50, "-25.00"
 */
export function parseCurrencyValue(value: string): number | null {
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

// ============================================================================
// TRADE FIELD PARSING
// ============================================================================

/** Trade type from the statement */
export type TradeType = "Trade" | "Final Settlement";

/**
 * Parse trade side (YES/NO subtype)
 */
export function parseTradeSide(subtypeStr: string): TradeSide | null {
  if (!subtypeStr) return null;
  const upper = subtypeStr.toUpperCase().trim();
  if (upper === "YES" || upper === "Y") return "YES";
  if (upper === "NO" || upper === "N") return "NO";
  return null;
}

/**
 * Parse trade type from text
 */
export function parseTradeType(typeStr: string): TradeType {
  if (!typeStr) return "Trade";
  const lower = typeStr.toLowerCase().trim();
  if (lower.includes("final") || lower.includes("settlement")) {
    return "Final Settlement";
  }
  return "Trade";
}
