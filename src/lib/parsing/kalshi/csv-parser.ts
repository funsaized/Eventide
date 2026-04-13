/**
 * Kalshi CSV Parser
 *
 * Parses Kalshi CSV export formats into typed row objects.
 * Pure functions — no side effects, no React dependencies.
 */

import type {
  KalshiActivityRow,
  KalshiParsedActivity,
  KalshiParsedTransactions,
  KalshiTransactionRow,
} from "./types";
import { parseCsvLine, parseIsoTimestamp, stripBom } from "./utils";

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

// ============================================================================
// ACTIVITY CSV PARSER
// ============================================================================

/**
 * Parse Kalshi Activity CSV content into typed row objects.
 * Filters to only Deposit and Credit rows — Order rows are discarded.
 * Handles UTF-8 BOM prefix and double-quoted fields.
 *
 * @param csvContent Full CSV string (with optional BOM + quoted fields)
 * @returns Parsed deposits and credits
 */
export function parseKalshiActivityCsv(csvContent: string): KalshiParsedActivity {
  const cleaned = stripBom(csvContent);
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return { deposits: [], credits: [], warnings: [] };
  }

  const headerFields = parseCsvLine(lines[0]).map((field) => field.trim());
  const headerMap = new Map<string, number>();
  headerFields.forEach((column, index) => {
    headerMap.set(column, index);
  });

  const deposits: KalshiActivityRow[] = [];
  const credits: KalshiActivityRow[] = [];
  const warnings: string[] = [];

  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    const fields = parseCsvLine(line);
    const type = (fields[headerMap.get("type") ?? -1] ?? "").trim();

    if (type === "Deposit") {
      deposits.push(buildActivityRow(fields, headerMap));
    } else if (type === "Credit") {
      credits.push(buildActivityRow(fields, headerMap));
    }
  }

  return { deposits, credits, warnings };
}

function buildActivityRow(
  fields: string[],
  headerMap: Map<string, number>
): KalshiActivityRow {
  const get = (column: keyof KalshiActivityRow): string => {
    return fields[headerMap.get(column) ?? -1] ?? "";
  };

  return {
    type: get("type"),
    Status: get("Status"),
    Amount_In_Dollars: get("Amount_In_Dollars"),
    Original_Date: get("Original_Date"),
    Traded_Time: get("Traded_Time"),
    Last_Updated: get("Last_Updated"),
    Deposit_Type: get("Deposit_Type"),
    Fee_In_Dollars: get("Fee_In_Dollars"),
    Market_Title: get("Market_Title"),
    Market_Ticker: get("Market_Ticker"),
    Market_Id: get("Market_Id"),
    Filled: get("Filled"),
    Remaining: get("Remaining"),
    Direction: get("Direction"),
    Order_Type: get("Order_Type"),
    Price_In_Cents: get("Price_In_Cents"),
    No_Contracts_Owned: get("No_Contracts_Owned"),
    No_Contracts_Average_Price_In_Cents: get("No_Contracts_Average_Price_In_Cents"),
    Yes_Contracts_Owned: get("Yes_Contracts_Owned"),
    Yes_Contracts_Average_Price_In_Cents: get("Yes_Contracts_Average_Price_In_Cents"),
    Result: get("Result"),
    Profit_In_Dollars: get("Profit_In_Dollars"),
    Credit_Reason: get("Credit_Reason"),
    Credit_Type: get("Credit_Type"),
    Introducing_Broker: get("Introducing_Broker"),
  };
}
