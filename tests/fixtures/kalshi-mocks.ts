/**
 * Kalshi CSV Mock Data
 *
 * Factory functions and fixtures for Kalshi CSV parser tests.
 */

import type { KalshiTransactionRow, KalshiActivityRow } from "@/lib/parsing/kalshi/types";

// ============================================================================
// CSV HEADERS (exact matches for detection tests)
// ============================================================================

export const KALSHI_TRANSACTION_HEADER =
  "type,quantity,market_ticker,side,entry_price_cents,exit_price_cents,open_fees_cents,close_fees_cents,realized_pnl_without_fees_cents,realized_pnl_with_fees_cents,close_timestamp,open_timestamp";

/** Activity CSV header — note UTF-8 BOM prefix \uFEFF */
export const KALSHI_ACTIVITY_HEADER =
  '\uFEFF"type","Status","Amount_In_Dollars","Original_Date","Traded_Time","Last_Updated","Deposit_Type","Fee_In_Dollars","Market_Title","Market_Ticker","Market_Id","Filled","Remaining","Direction","Order_Type","Price_In_Cents","No_Contracts_Owned","No_Contracts_Average_Price_In_Cents","Yes_Contracts_Owned","Yes_Contracts_Average_Price_In_Cents","Result","Profit_In_Dollars","Credit_Reason","Credit_Type","Introducing_Broker"';

// ============================================================================
// TRANSACTION ROW FACTORIES
// ============================================================================

/** Default winning trade: entry 65¢, exit 100¢, qty 10 */
export function createMockKalshiTransactionRow(
  overrides?: Partial<KalshiTransactionRow>
): KalshiTransactionRow {
  return {
    type: "trade",
    quantity: 10,
    market_ticker: "KXNFLGAME-25SEP08DALPHI-PHI",
    side: "yes",
    entry_price_cents: 65,
    exit_price_cents: 100,
    open_fees_cents: 30,
    close_fees_cents: 0,
    realized_pnl_without_fees_cents: 350,
    realized_pnl_with_fees_cents: 320,
    close_timestamp: "2026-01-24T14:53:59-05:00",
    open_timestamp: "2026-01-24T06:31:32-05:00",
    ...overrides,
  };
}

/** Expired worthless trade: entry 3¢, exit 0 */
export function createMockKalshiExpiredRow(
  overrides?: Partial<KalshiTransactionRow>
): KalshiTransactionRow {
  return createMockKalshiTransactionRow({
    market_ticker: "KXNFLGAME-25SEP08DALPHI-DAL",
    entry_price_cents: 3,
    exit_price_cents: 0,
    quantity: 333,
    open_fees_cents: 64,
    close_fees_cents: 0,
    realized_pnl_without_fees_cents: -999,
    realized_pnl_with_fees_cents: -1063,
    ...overrides,
  });
}

/** Crypto trade for category tests */
export function createMockKalshiCryptoRow(
  overrides?: Partial<KalshiTransactionRow>
): KalshiTransactionRow {
  return createMockKalshiTransactionRow({
    market_ticker: "KXETH-26FEB0511-B1940",
    entry_price_cents: 30,
    exit_price_cents: 19,
    quantity: 50,
    open_fees_cents: 74,
    close_fees_cents: 54,
    realized_pnl_without_fees_cents: -550,
    realized_pnl_with_fees_cents: -678,
    close_timestamp: "2026-02-05T10:41:45-05:00",
    open_timestamp: "2026-02-05T10:39:02-05:00",
    ...overrides,
  });
}

// ============================================================================
// CSV STRING GENERATORS
// ============================================================================

/** Serialize a transaction row to a CSV line (unquoted) */
function transactionRowToCsvLine(row: KalshiTransactionRow): string {
  return [
    row.type,
    row.quantity,
    row.market_ticker,
    row.side,
    row.entry_price_cents,
    row.exit_price_cents,
    row.open_fees_cents,
    row.close_fees_cents,
    row.realized_pnl_without_fees_cents,
    row.realized_pnl_with_fees_cents,
    row.close_timestamp,
    row.open_timestamp,
  ].join(",");
}

/**
 * Generate a full Kalshi Transactions CSV string.
 * Defaults to 3 diverse rows if none provided.
 */
export function createMockKalshiTransactionsCsv(
  rows?: KalshiTransactionRow[]
): string {
  const dataRows = rows ?? [
    createMockKalshiTransactionRow(),
    createMockKalshiExpiredRow(),
    createMockKalshiCryptoRow(),
  ];
  return [KALSHI_TRANSACTION_HEADER, ...dataRows.map(transactionRowToCsvLine)].join("\n");
}

// ============================================================================
// ACTIVITY ROW FACTORIES
// ============================================================================

export function createMockKalshiDepositRow(
  overrides?: Partial<KalshiActivityRow>
): KalshiActivityRow {
  const base: KalshiActivityRow = {
    type: "",
    Status: "",
    Amount_In_Dollars: "",
    Original_Date: "",
    Traded_Time: "",
    Last_Updated: "",
    Deposit_Type: "",
    Fee_In_Dollars: "",
    Market_Title: "",
    Market_Ticker: "",
    Market_Id: "",
    Filled: "",
    Remaining: "",
    Direction: "",
    Order_Type: "",
    Price_In_Cents: "",
    No_Contracts_Owned: "",
    No_Contracts_Average_Price_In_Cents: "",
    Yes_Contracts_Owned: "",
    Yes_Contracts_Average_Price_In_Cents: "",
    Result: "",
    Profit_In_Dollars: "",
    Credit_Reason: "",
    Credit_Type: "",
    Introducing_Broker: "",
  };

  return {
    ...base,
    type: "Deposit",
    Status: "Applied",
    Amount_In_Dollars: "100",
    Original_Date: "2026-04-06T10:24:46.311Z",
    Deposit_Type: "ach",
    Fee_In_Dollars: "0",
    ...overrides,
  };
}

export function createMockKalshiCreditRow(
  overrides?: Partial<KalshiActivityRow>
): KalshiActivityRow {
  return createMockKalshiDepositRow({
    type: "Credit",
    Amount_In_Dollars: "5",
    Original_Date: "2026-02-09T22:26:32.622Z",
    Deposit_Type: "",
    Fee_In_Dollars: "0",
    Credit_Reason: "Big Game Deposit Delay Credit",
    Credit_Type: "incentive",
    ...overrides,
  });
}

export function createMockKalshiOrderRow(
  overrides?: Partial<KalshiActivityRow>
): KalshiActivityRow {
  return createMockKalshiDepositRow({
    type: "Order",
    Status: "Filled",
    Amount_In_Dollars: "",
    Deposit_Type: "",
    Market_Ticker: "KXNFLGAME-25SEP08DALPHI-PHI",
    Filled: "10",
    Remaining: "0",
    ...overrides,
  });
}

/** Serialize an activity row to a quoted CSV line */
function activityRowToCsvLine(row: KalshiActivityRow): string {
  return Object.values(row)
    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
    .join(",");
}

/**
 * Generate a full Kalshi Activity CSV string (with BOM + quoted fields).
 * Defaults to 2 deposits, 3 orders, 1 credit.
 */
export function createMockKalshiActivityCsv(
  rows?: KalshiActivityRow[]
): string {
  const dataRows = rows ?? [
    createMockKalshiDepositRow(),
    createMockKalshiDepositRow({ Amount_In_Dollars: "25.5", Deposit_Type: "debit" }),
    createMockKalshiOrderRow(),
    createMockKalshiOrderRow({ Market_Ticker: "KXETH-26FEB0511-B1940" }),
    createMockKalshiOrderRow({ Market_Ticker: "KXOSCARPIC-26-HAM" }),
    createMockKalshiCreditRow(),
  ];
  return [KALSHI_ACTIVITY_HEADER, ...dataRows.map(activityRowToCsvLine)].join("\n");
}