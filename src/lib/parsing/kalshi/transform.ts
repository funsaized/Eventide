/**
 * Kalshi Transaction Transformer
 *
 * Converts Kalshi transaction CSV rows into database input records.
 * Pure functions only.
 */

import type { CreateClosedPositionInput, CreateTradeInput } from "@/lib/db/types";
import { categorizeSymbol } from "@/lib/parsing/symbol";

import type { KalshiTransactionRow } from "./types";
import { centsToDecimal, normalizeSide, parseIsoTimestamp } from "./utils";

/**
 * Convert one Kalshi transaction row into an OPEN + CLOSE trade pair.
 *
 * CRITICAL: settlement_price must be placed on the OPEN trade so SQL P&L
 * computes against the entry price. CLOSE intentionally omits settlement_price.
 */
export function transactionToTrades(
  row: KalshiTransactionRow,
  importId: string,
  accountId: string,
): { openTrade: CreateTradeInput; closeTrade: CreateTradeInput } {
  const side = normalizeSide(row.side);
  const openDate = parseIsoTimestamp(row.open_timestamp);
  const closeDate = parseIsoTimestamp(row.close_timestamp);
  const symbol = row.market_ticker;
  const category = categorizeSymbol(symbol);
  const entryPrice = centsToDecimal(row.entry_price_cents);
  const exitPrice = centsToDecimal(row.exit_price_cents);
  const openFees = centsToDecimal(row.open_fees_cents);
  const closeFees = centsToDecimal(row.close_fees_cents);
  const platformMetadata = {
    market_ticker: row.market_ticker,
    open_timestamp: row.open_timestamp,
    close_timestamp: row.close_timestamp,
  };

  const openTrade: CreateTradeInput = {
    import_id: importId,
    platform: "kalshi",
    account_id: accountId,
    trade_date: openDate,
    symbol,
    side,
    quantity: row.quantity,
    price: entryPrice,
    fees: openFees,
    trade_type: "OPEN",
    category,
    settlement_date: closeDate,
    settlement_price: exitPrice,
    platform_metadata: platformMetadata,
  };

  const closeTrade: CreateTradeInput = {
    import_id: importId,
    platform: "kalshi",
    account_id: accountId,
    trade_date: closeDate,
    symbol,
    side,
    quantity: row.quantity,
    price: exitPrice,
    fees: closeFees,
    trade_type: "CLOSE",
    category,
    platform_metadata: platformMetadata,
  };

  return { openTrade, closeTrade };
}

/**
 * Convert one Kalshi transaction row into a closed position record.
 * Kalshi CSV P&L values are authoritative.
 */
export function transactionToClosedPosition(
  row: KalshiTransactionRow,
  importId: string,
): CreateClosedPositionInput {
  return {
    import_id: importId,
    platform: "kalshi",
    symbol: row.market_ticker,
    entry_date: parseIsoTimestamp(row.open_timestamp),
    exit_date: parseIsoTimestamp(row.close_timestamp),
    entry_price: centsToDecimal(row.entry_price_cents),
    exit_price: centsToDecimal(row.exit_price_cents),
    quantity: row.quantity,
    gross_pnl: centsToDecimal(row.realized_pnl_without_fees_cents),
    fees: centsToDecimal(row.open_fees_cents + row.close_fees_cents),
    net_pnl: centsToDecimal(row.realized_pnl_with_fees_cents),
    calculated_pnl: centsToDecimal(row.realized_pnl_without_fees_cents),
    pnl_discrepancy: 0,
  };
}

/**
 * Transform all Kalshi transaction rows into trade and closed-position inputs.
 */
export function transformAllTransactions(
  rows: KalshiTransactionRow[],
  importId: string,
  accountId: string,
): { trades: CreateTradeInput[]; closedPositions: CreateClosedPositionInput[] } {
  const trades: CreateTradeInput[] = [];
  const closedPositions: CreateClosedPositionInput[] = [];

  for (const row of rows) {
    const { openTrade, closeTrade } = transactionToTrades(row, importId, accountId);
    trades.push(openTrade, closeTrade);
    closedPositions.push(transactionToClosedPosition(row, importId));
  }

  return { trades, closedPositions };
}
