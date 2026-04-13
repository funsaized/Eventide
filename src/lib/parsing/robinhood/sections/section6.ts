/**
 * Section 6 Parser: Journal Entries
 *
 * Parses cash flow entries (deposits, withdrawals, fees, adjustments)
 * from the Journal Entries section.
 */

import type { JournalEntry } from "../types";
import type { SectionBoundary } from "./boundaries";
import {
  SECTION6_COLUMNS,
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
  parseCurrencyValue,
  parseLogger,
} from "./parse-helpers";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Cash flow type classification
 */
export type CashFlowType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "INTEREST"
  | "FEE"
  | "ADJUSTMENT"
  | "OTHER";

/**
 * A journal entry row from Section 6
 */
export interface JournalEntryRow {
  /** Entry date (ISO format YYYY-MM-DD) */
  date: string;
  /** Account type (usually "SW") */
  accountType: string;
  /** Full description */
  description: string;
  /** Currency code (usually "USD") */
  currency: string;
  /** Credit/Debit amount (positive for deposits, negative for withdrawals) */
  creditDebit: number;
  /** Running balance (if available) */
  balance: number | null;
  /** Classified cash flow type */
  type: CashFlowType;
  /** Raw row text for debugging */
  rawText?: string;
}

/**
 * Result of parsing Section 6
 */
export interface Section6ParseResult {
  /** Parsed journal entries */
  entries: JournalEntryRow[];
  /** Number of rows processed */
  rowsProcessed: number;
  /** Number of valid entries extracted */
  validEntries: number;
  /** Parsing warnings */
  warnings: string[];
  /** Column layout used */
  layout: ColumnLayout | null;
}

// ============================================================================
// CASH FLOW CLASSIFICATION
// ============================================================================

/**
 * Keywords for classifying cash flow types
 */
const CASH_FLOW_PATTERNS: Array<{
  type: CashFlowType;
  patterns: RegExp[];
}> = [
  {
    type: "DEPOSIT",
    patterns: [
      /deposit/i,
      /transfer\s*in/i,
      /ach\s*credit/i,
      /wire\s*in/i,
      /funding/i,
    ],
  },
  {
    type: "WITHDRAWAL",
    patterns: [
      /withdraw/i,
      /transfer\s*out/i,
      /ach\s*debit/i,
      /wire\s*out/i,
      /distribution/i,
    ],
  },
  {
    type: "INTEREST",
    patterns: [
      /interest/i,
      /dividend/i,
      /yield/i,
    ],
  },
  {
    type: "FEE",
    patterns: [
      /fee/i,
      /commission/i,
      /charge/i,
      /cost/i,
    ],
  },
  {
    type: "ADJUSTMENT",
    patterns: [
      /adjust/i,
      /correction/i,
      /reversal/i,
      /rebate/i,
    ],
  },
];

/**
 * Classify cash flow type from description
 */
export function classifyCashFlow(description: string): CashFlowType {
  if (!description) return "OTHER";

  const lower = description.toLowerCase();

  for (const { type, patterns } of CASH_FLOW_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        return type;
      }
    }
  }

  return "OTHER";
}

/**
 * Infer cash flow type from amount when description is unclear
 */
export function inferCashFlowType(
  description: string,
  amount: number
): CashFlowType {
  // First try to classify from description
  const descType = classifyCashFlow(description);
  if (descType !== "OTHER") {
    return descType;
  }

  // If description doesn't help, infer from amount sign
  // Positive amounts are typically deposits, negative are withdrawals
  if (amount > 0) {
    return "DEPOSIT";
  } else if (amount < 0) {
    return "WITHDRAWAL";
  }

  return "OTHER";
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a parsed journal entry
 */
function isValidEntry(entry: Partial<JournalEntryRow>): boolean {
  // Must have a date
  if (!entry.date) return false;

  // Must have a non-zero amount (creditDebit)
  if (entry.creditDebit === null || entry.creditDebit === undefined) return false;
  if (entry.creditDebit === 0) return false; // Zero entries are usually not meaningful

  // Should have a description (but allow empty)
  return true;
}

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse Section 6 (Journal Entries)
 */
export function parseSection6(
  boundary: SectionBoundary,
  pageWidth: number
): Section6ParseResult {
  const items = boundary.items;
  const warnings: string[] = [];
  const entries: JournalEntryRow[] = [];

  if (items.length === 0) {
    return {
      entries: [],
      rowsProcessed: 0,
      validEntries: 0,
      warnings: ["Section 6 has no items"],
      layout: null,
    };
  }

  // Find the header row
  const headerResult = findHeaderRow(items, SECTION6_COLUMNS, pageWidth);
  if (!headerResult) {
    parseLogger.header("S6", { found: false });
    warnings.push("Could not find column headers in Section 6");
    return {
      entries: [],
      rowsProcessed: 0,
      validEntries: 0,
      warnings,
      layout: null,
    };
  }

  parseLogger.header("S6", {
    found: true,
    rowIndex: headerResult.headerRowIndex,
    columnCount: headerResult.headerItems.length,
  });

  // Calibrate columns from header
  const layout = calibrateColumns(
    headerResult.headerItems,
    SECTION6_COLUMNS,
    pageWidth
  );

  // Get items after header
  const dataItems = items.slice(
    headerResult.headerRowIndex + headerResult.headerItems.length
  );

  // Group into rows
  const rows = groupIntoRows(dataItems);

  let rowsProcessed = 0;

  for (const row of rows) {
    rowsProcessed++;

    // Get row text for header detection
    const rowText = row.map((item) => item.text).join(" ");

    // Skip repeated headers on page breaks
    if (isRepeatedHeader(rowText, SECTION6_COLUMNS)) {
      continue;
    }

    // Skip total/summary rows
    if (/total/i.test(rowText) || /summary/i.test(rowText)) {
      continue;
    }

    // Parse row to column values
    const values = parseRowToColumns(row, layout);

    // Check if this is a data row
    if (!isDataRow(values, SECTION6_COLUMNS)) {
      continue;
    }

    // Parse the date
    const date = parseDateToISO(values.date ?? "");
    if (!date) {
      // Not a valid data row
      continue;
    }

    // Parse the amount
    const creditDebit = parseCurrencyValue(values.creditDebit ?? "");
    if (creditDebit === null) {
      warnings.push(`Invalid amount in row: ${rowText.substring(0, 50)}`);
      continue;
    }

    // Parse optional balance
    const balance = parseCurrencyValue(values.balance ?? "");

    // Get description
    const description = values.description?.trim() ?? "";

    // Classify the entry type
    const type = inferCashFlowType(description, creditDebit);

    // Create new entry
    const entry: JournalEntryRow = {
      date,
      accountType: values.accountType ?? "SW",
      description,
      currency: values.currency ?? "USD",
      creditDebit,
      balance,
      type,
      rawText: rowText,
    };

    if (isValidEntry(entry)) {
      entries.push(entry);
    }
  }

  parseLogger.result("S6", {
    rowsProcessed,
    validCount: entries.length,
    warnings: warnings.length > 0 ? warnings : undefined,
  });

  return {
    entries,
    rowsProcessed,
    validEntries: entries.length,
    warnings,
    layout,
  };
}

// ============================================================================
// JOURNAL ENTRY UTILITIES
// ============================================================================

/**
 * Convert JournalEntryRow to the JournalEntry type from types.ts
 */
export function toJournalEntry(row: JournalEntryRow): JournalEntry {
  return {
    date: row.date,
    type: row.type,
    amount: row.creditDebit,
    description: row.description,
  };
}

/**
 * Get total deposits from entries
 */
export function getTotalDeposits(entries: JournalEntryRow[]): number {
  return entries
    .filter((e) => e.type === "DEPOSIT")
    .reduce((sum, e) => sum + Math.abs(e.creditDebit), 0);
}

/**
 * Get total withdrawals from entries
 */
export function getTotalWithdrawals(entries: JournalEntryRow[]): number {
  return entries
    .filter((e) => e.type === "WITHDRAWAL")
    .reduce((sum, e) => sum + Math.abs(e.creditDebit), 0);
}

/**
 * Get total fees from entries
 */
export function getTotalFees(entries: JournalEntryRow[]): number {
  return entries
    .filter((e) => e.type === "FEE")
    .reduce((sum, e) => sum + Math.abs(e.creditDebit), 0);
}

/**
 * Get net cash activity (deposits - withdrawals)
 */
export function getNetCashActivity(entries: JournalEntryRow[]): number {
  return entries.reduce((sum, e) => sum + e.creditDebit, 0);
}

/**
 * Filter entries by type
 */
export function filterByType(
  entries: JournalEntryRow[],
  type: CashFlowType
): JournalEntryRow[] {
  return entries.filter((e) => e.type === type);
}

/**
 * Filter entries by date range
 */
export function filterByDateRange(
  entries: JournalEntryRow[],
  startDate: string,
  endDate: string
): JournalEntryRow[] {
  return entries.filter((e) => e.date >= startDate && e.date <= endDate);
}

/**
 * Group entries by type
 */
export function groupByType(
  entries: JournalEntryRow[]
): Map<CashFlowType, JournalEntryRow[]> {
  const groups = new Map<CashFlowType, JournalEntryRow[]>();

  for (const entry of entries) {
    const existing = groups.get(entry.type) ?? [];
    existing.push(entry);
    groups.set(entry.type, existing);
  }

  return groups;
}
