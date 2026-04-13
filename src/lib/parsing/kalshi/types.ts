/**
 * Kalshi CSV Parsing Types
 *
 * Type definitions for Kalshi CSV export formats.
 * Two formats: Transactions (yearly) and Activity (recent).
 */

// ============================================================================
// CSV ROW TYPES (raw parsed from CSV, values still in cents for Transactions)
// ============================================================================

/**
 * A single row from Kalshi-Transactions-YYYY.csv
 * All monetary values are in CENTS (integers).
 * Timestamps are ISO 8601 with timezone offset.
 */
export interface KalshiTransactionRow {
  type: string;
  quantity: number;
  market_ticker: string;
  side: string; // "yes" or "no" (lowercase in CSV)
  entry_price_cents: number;
  exit_price_cents: number;
  open_fees_cents: number;
  close_fees_cents: number;
  realized_pnl_without_fees_cents: number;
  realized_pnl_with_fees_cents: number;
  close_timestamp: string;
  open_timestamp: string;
}

/**
 * A single row from Kalshi-Recent-Activity-All.csv
 * Monetary values: Amount_In_Dollars and Fee_In_Dollars in dollars; Price_In_Cents in cents.
 */
export interface KalshiActivityRow {
  type: string; // "Deposit" | "Order" | "Credit"
  Status: string;
  Amount_In_Dollars: string;
  Original_Date: string;
  Traded_Time: string;
  Last_Updated: string;
  Deposit_Type: string;
  Fee_In_Dollars: string;
  Market_Title: string;
  Market_Ticker: string;
  Market_Id: string;
  Filled: string;
  Remaining: string;
  Direction: string;
  Order_Type: string;
  Price_In_Cents: string;
  No_Contracts_Owned: string;
  No_Contracts_Average_Price_In_Cents: string;
  Yes_Contracts_Owned: string;
  Yes_Contracts_Average_Price_In_Cents: string;
  Result: string;
  Profit_In_Dollars: string;
  Credit_Reason: string;
  Credit_Type: string;
  Introducing_Broker: string;
}

// ============================================================================
// PARSED RESULT TYPES
// ============================================================================

/** Result of parsing a Kalshi Transactions CSV */
export interface KalshiParsedTransactions {
  rows: KalshiTransactionRow[];
  warnings: string[];
  rowCount: number;
  invalidRowCount: number;
}

/** Result of parsing a Kalshi Activity CSV */
export interface KalshiParsedActivity {
  deposits: KalshiActivityRow[];
  credits: KalshiActivityRow[];
  warnings: string[];
}

/** Detected Kalshi CSV subtype */
export type KalshiCsvType = "transactions" | "activity" | "unknown";