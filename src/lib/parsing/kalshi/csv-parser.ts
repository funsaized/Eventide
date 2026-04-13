/**
 * Kalshi CSV Parser
 *
 * Parses Kalshi CSV export formats into typed row objects.
 * Pure functions — no side effects, no React dependencies.
 */

import type { KalshiParsedTransactions, KalshiTransactionRow } from "./types";
import { parseCsvLine, parseIsoTimestamp } from "./utils";

// ============================================================================
// TRANSACTIONS CSV PARSER
// ============================================================================

const TRANSACTION_COLUMNS = [
  "type",
  "quantity",
  "market_ticker",
  "side",
  "entry_price_cents",
  "exit_price_cents",
  "open_fees_cents",
  "close_fees_cents",
  "realized_pnl_without_fees_cents",
  "realized_pnl_with_fees_cents",
  "close_timestamp",
  "open_timestamp",
] as const;

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a single Transactions CSV row into a typed object.
 * Returns null if the row is invalid or missing required fields.
 */
export function parseTransactionRow(
  fields: string[],
  headerMap: Map<string, number>,
  rowIndex: number
): KalshiTransactionRow | null {
  const get = (column: (typeof TRANSACTION_COLUMNS)[number]): string => {
    const index = headerMap.get(column);
    if (index === undefined) {
      throw new Error(`Row ${rowIndex}: missing header mapping for column \"${column}\"`);
    }
    return (fields[index] ?? "").trim();
  };

  const market_ticker = get("market_ticker");
  if (!market_ticker) {
    return null;
  }

  const quantity = Number.parseInt(get("quantity"), 10);
  if (Number.isNaN(quantity) || quantity <= 0) {
    return null;
  }

  const open_timestamp = get("open_timestamp");
  const close_timestamp = get("close_timestamp");

  try {
    parseIsoTimestamp(open_timestamp);
    parseIsoTimestamp(close_timestamp);
  } catch {
    return null;
  }

  return {
    type: get("type"),
    quantity,
    market_ticker,
    side: get("side"),
    entry_price_cents: parseInteger(get("entry_price_cents")),
    exit_price_cents: parseInteger(get("exit_price_cents")),
    open_fees_cents: parseInteger(get("open_fees_cents")),
    close_fees_cents: parseInteger(get("close_fees_cents")),
    realized_pnl_without_fees_cents: parseInteger(get("realized_pnl_without_fees_cents")),
    realized_pnl_with_fees_cents: parseInteger(get("realized_pnl_with_fees_cents")),
    close_timestamp,
    open_timestamp,
  };
}

/**
 * Parse Kalshi Transactions CSV content into typed row objects.
 *
 * @param csvContent Full CSV string (header + data rows)
 * @returns Parsed result with rows, warnings, and counts
 * @throws Error if the header row does not match the expected format
 */
export function parseKalshiTransactionsCsv(csvContent: string): KalshiParsedTransactions {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return {
      rows: [],
      warnings: [],
      rowCount: 0,
      invalidRowCount: 0,
    };
  }

  const headerFields = parseCsvLine(lines[0]).map((field) => field.trim());
  const headerMap = new Map<string, number>();
  headerFields.forEach((field, index) => {
    headerMap.set(field, index);
  });

  for (const column of TRANSACTION_COLUMNS) {
    if (!headerMap.has(column)) {
      throw new Error(
        `Invalid Kalshi Transactions CSV: missing column \"${column}\". Found columns: ${headerFields.join(", ")}`
      );
    }
  }

  const rows: KalshiTransactionRow[] = [];
  const warnings: string[] = [];
  let invalidRowCount = 0;
  let rowCount = 0;

  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    rowCount++;

    const row = parseTransactionRow(parseCsvLine(line), headerMap, index + 1);
    if (row === null) {
      invalidRowCount++;
      warnings.push(`Row ${index + 1}: invalid or missing required fields — skipped`);
      continue;
    }

    rows.push(row);
  }

  return {
    rows,
    warnings,
    rowCount,
    invalidRowCount,
  };
}
