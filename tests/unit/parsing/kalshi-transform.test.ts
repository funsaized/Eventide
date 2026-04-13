/**
 * Kalshi Transaction Transformer Tests
 */

import { describe, it, expect } from "vitest";
import {
  transactionToTrades,
  transactionToClosedPosition,
  transformAllTransactions,
} from "@/lib/parsing/kalshi/transform";
import {
  createMockKalshiTransactionRow,
  createMockKalshiExpiredRow,
} from "../../fixtures/kalshi-mocks";

// ============================================================================
// transactionToTrades
// ============================================================================

describe("transactionToTrades", () => {
  it("should produce OPEN and CLOSE trades for a winning trade", () => {
    const row = createMockKalshiTransactionRow({
      quantity: 10,
      side: "yes",
      entry_price_cents: 65,
      exit_price_cents: 100,
      open_fees_cents: 30,
      close_fees_cents: 0,
      open_timestamp: "2026-01-24T06:31:32-05:00",
      close_timestamp: "2026-01-24T14:53:59-05:00",
    });

    const { openTrade, closeTrade } = transactionToTrades(row, "import-1", "kalshi-default");

    expect(openTrade.trade_type).toBe("OPEN");
    expect(openTrade.price).toBe(0.65);
    expect(openTrade.settlement_price).toBe(1);
    expect(openTrade.fees).toBe(0.3);
    expect(openTrade.side).toBe("YES");
    expect(openTrade.quantity).toBe(10);
    expect(openTrade.trade_date).toBe("2026-01-24");
    expect(openTrade.settlement_date).toBe("2026-01-24");
    expect(openTrade.platform).toBe("kalshi");

    expect(closeTrade.trade_type).toBe("CLOSE");
    expect(closeTrade.price).toBe(1);
    expect(closeTrade.settlement_price).toBeUndefined();
    expect(closeTrade.fees).toBe(0);
    expect(closeTrade.side).toBe("YES");
    expect(closeTrade.quantity).toBe(10);
    expect(closeTrade.trade_date).toBe("2026-01-24");
    expect(closeTrade.platform).toBe("kalshi");
  });

  it("should handle expired worthless trade (exit_price = 0)", () => {
    const row = createMockKalshiExpiredRow();
    const { openTrade, closeTrade } = transactionToTrades(row, "import-1", "kalshi-default");

    expect(openTrade.settlement_price).toBe(0);
    expect(openTrade.price).toBe(0.03);
    expect(closeTrade.price).toBe(0);
    expect(closeTrade.settlement_price).toBeUndefined();
  });

  it("should split fees correctly between OPEN and CLOSE trades", () => {
    const row = createMockKalshiTransactionRow({
      open_fees_cents: 74,
      close_fees_cents: 54,
    });
    const { openTrade, closeTrade } = transactionToTrades(row, "import-1", "kalshi-default");

    expect(openTrade.fees).toBe(0.74);
    expect(closeTrade.fees).toBe(0.54);
  });

  it("should store platform_metadata with timestamps", () => {
    const row = createMockKalshiTransactionRow({
      market_ticker: "KXETH-26FEB0511-B1940",
      open_timestamp: "2026-02-05T10:39:02-05:00",
      close_timestamp: "2026-02-05T10:41:45-05:00",
    });
    const { openTrade } = transactionToTrades(row, "import-1", "kalshi-default");

    expect(openTrade.platform_metadata).toBeDefined();
    const meta = openTrade.platform_metadata as Record<string, unknown>;
    expect(meta.market_ticker).toBe("KXETH-26FEB0511-B1940");
    expect(meta.open_timestamp).toBe("2026-02-05T10:39:02-05:00");
    expect(meta.close_timestamp).toBe("2026-02-05T10:41:45-05:00");
  });

  it("should normalize side to uppercase", () => {
    const row = createMockKalshiTransactionRow({ side: "no" });
    const { openTrade, closeTrade } = transactionToTrades(row, "import-1", "kalshi-default");

    expect(openTrade.side).toBe("NO");
    expect(closeTrade.side).toBe("NO");
  });
});

// ============================================================================
// transactionToClosedPosition
// ============================================================================

describe("transactionToClosedPosition", () => {
  it("should map P&L from CSV cents to dollars", () => {
    const row = createMockKalshiTransactionRow({
      quantity: 10,
      entry_price_cents: 65,
      exit_price_cents: 100,
      open_fees_cents: 30,
      close_fees_cents: 0,
      realized_pnl_without_fees_cents: 350,
      realized_pnl_with_fees_cents: 320,
      open_timestamp: "2026-01-24T06:31:32-05:00",
      close_timestamp: "2026-01-24T14:53:59-05:00",
    });

    const position = transactionToClosedPosition(row, "import-1");

    expect(position.gross_pnl).toBe(3.5);
    expect(position.net_pnl).toBe(3.2);
    expect(position.fees).toBe(0.3);
    expect(position.entry_price).toBe(0.65);
    expect(position.exit_price).toBe(1);
    expect(position.quantity).toBe(10);
    expect(position.pnl_discrepancy).toBe(0);
    expect(position.platform).toBe("kalshi");
  });

  it("should handle negative P&L (losing trade)", () => {
    const row = createMockKalshiExpiredRow();
    const position = transactionToClosedPosition(row, "import-1");

    expect(position.gross_pnl).toBeLessThan(0);
    expect(position.exit_price).toBe(0);
  });
});

// ============================================================================
// transformAllTransactions
// ============================================================================

describe("transformAllTransactions", () => {
  it("should produce 2 trades and 1 position per row", () => {
    const rows = [createMockKalshiTransactionRow(), createMockKalshiExpiredRow()];
    const result = transformAllTransactions(rows, "import-1", "kalshi-default");

    expect(result.trades).toHaveLength(4);
    expect(result.closedPositions).toHaveLength(2);
  });
});
