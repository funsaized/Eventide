/**
 * Fee Attribution Tests
 *
 * Tests for distributing fees from Section 3 to individual trades.
 */

import { describe, it, expect } from "vitest";
import {
  attributeFees,
  validateFeeAttribution,
  initializeTradeWithFees,
  getTotalTradesFees,
  getTradesFeeBreakdown,
  getUnattributedTrades,
  calculateFeeRate,
  type TradeWithFees,
} from "@/lib/calculations/fee-attribution";
import type { TradeEntry } from "@/lib/calculations/fifo";
import type { TradeConfirmationSummary } from "@/lib/parsing/sections/section3";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTrade(overrides: Partial<TradeEntry> = {}): TradeEntry {
  return {
    date: "2024-09-04",
    symbol: "KXTEST-24SEP04",
    side: "YES",
    quantity: 10,
    price: 0.50,
    type: "OPEN",
    fees: 0,
    ...overrides,
  };
}

function createSummary(
  overrides: Partial<TradeConfirmationSummary> = {}
): TradeConfirmationSummary {
  return {
    tradeDate: "2024-09-04",
    accountType: "SW",
    totalQtyLong: 10,
    totalQtyShort: 0,
    subtype: "YES",
    symbol: "KXTEST-24SEP04",
    exchange: "Kalshi",
    expDate: null,
    commissions: 0.05,
    exchangeFees: 0.03,
    nfaFees: 0.01,
    totalFees: 0.09,
    currency: "USD",
    description: "Test summary",
    ...overrides,
  };
}

// ============================================================================
// ATTRIBUTE FEES TESTS
// ============================================================================

describe("attributeFees", () => {
  it("should attribute fees to matching trades", () => {
    const trades: TradeEntry[] = [
      createTrade({ quantity: 10 }),
    ];

    const summaries: TradeConfirmationSummary[] = [
      createSummary({
        commissions: 0.05,
        exchangeFees: 0.03,
        nfaFees: 0.01,
        totalFees: 0.09,
      }),
    ];

    const result = attributeFees(trades, summaries);

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].feesAttributed).toBe(true);
    expect(result.trades[0].commissionFees).toBeCloseTo(0.05, 4);
    expect(result.trades[0].exchangeFees).toBeCloseTo(0.03, 4);
    expect(result.trades[0].nfaFees).toBeCloseTo(0.01, 4);
    expect(result.trades[0].totalFees).toBeCloseTo(0.09, 4);
  });

  it("should distribute fees proportionally by quantity", () => {
    const trades: TradeEntry[] = [
      createTrade({ quantity: 10 }), // 10/30 = 1/3
      createTrade({ date: "2024-09-04", quantity: 20 }), // 20/30 = 2/3
    ];

    const summaries: TradeConfirmationSummary[] = [
      createSummary({
        totalQtyLong: 30,
        totalFees: 0.90, // $0.90 total fees
        commissions: 0.60,
        exchangeFees: 0.20,
        nfaFees: 0.10,
      }),
    ];

    const result = attributeFees(trades, summaries);

    // First trade: 1/3 of fees
    expect(result.trades[0].totalFees).toBeCloseTo(0.30, 4);
    expect(result.trades[0].commissionFees).toBeCloseTo(0.20, 4);

    // Second trade: 2/3 of fees
    expect(result.trades[1].totalFees).toBeCloseTo(0.60, 4);
    expect(result.trades[1].commissionFees).toBeCloseTo(0.40, 4);
  });

  it("should match trades by symbol, date, and side", () => {
    const trades: TradeEntry[] = [
      createTrade({ symbol: "SYMBOL1", date: "2024-09-04", side: "YES", quantity: 10 }),
      createTrade({ symbol: "SYMBOL1", date: "2024-09-05", side: "YES", quantity: 10 }), // Different date
      createTrade({ symbol: "SYMBOL2", date: "2024-09-04", side: "YES", quantity: 10 }), // Different symbol
    ];

    const summaries: TradeConfirmationSummary[] = [
      createSummary({
        symbol: "SYMBOL1",
        tradeDate: "2024-09-04",
        subtype: "YES",
        totalFees: 0.10,
        commissions: 0.10,
        exchangeFees: 0,
        nfaFees: 0,
      }),
    ];

    const result = attributeFees(trades, summaries);

    // Only first trade should get fees
    expect(result.trades[0].feesAttributed).toBe(true);
    expect(result.trades[0].totalFees).toBeCloseTo(0.10, 4);

    expect(result.trades[1].feesAttributed).toBe(false);
    expect(result.trades[1].totalFees).toBe(0);

    expect(result.trades[2].feesAttributed).toBe(false);
    expect(result.trades[2].totalFees).toBe(0);
  });

  it("should handle summaries without matching trades", () => {
    const trades: TradeEntry[] = [
      createTrade({ symbol: "DIFFERENT-SYMBOL" }),
    ];

    const summaries: TradeConfirmationSummary[] = [
      createSummary({
        symbol: "KXTEST-24SEP04",
        totalFees: 0.50,
        commissions: 0.50,
        exchangeFees: 0,
        nfaFees: 0,
      }),
    ];

    const result = attributeFees(trades, summaries);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("No trades found");
    expect(result.unattributedFees).toBeCloseTo(0.50, 2);
  });

  it("should try matching without side when exact match fails", () => {
    const trades: TradeEntry[] = [
      createTrade({ symbol: "SYMBOL1", date: "2024-09-04", side: "YES", quantity: 10 }),
      createTrade({ symbol: "SYMBOL1", date: "2024-09-04", side: "NO", quantity: 10 }),
    ];

    // Summary has different subtype than trades
    const summaries: TradeConfirmationSummary[] = [
      createSummary({
        symbol: "SYMBOL1",
        tradeDate: "2024-09-04",
        subtype: "MIXED" as "YES", // Simulating combined summary
        totalFees: 0.20,
        commissions: 0.20,
        exchangeFees: 0,
        nfaFees: 0,
      }),
    ];

    const result = attributeFees(trades, summaries);

    // Should distribute to both YES and NO trades
    expect(result.totalFeesAttributed).toBeCloseTo(0.20, 4);
    expect(result.trades[0].totalFees + result.trades[1].totalFees).toBeCloseTo(0.20, 4);
  });

  it("should handle empty trades array", () => {
    const trades: TradeEntry[] = [];
    const summaries: TradeConfirmationSummary[] = [
      createSummary({ totalFees: 0.10 }),
    ];

    const result = attributeFees(trades, summaries);

    expect(result.trades).toHaveLength(0);
    expect(result.totalFeesAttributed).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should handle empty summaries array", () => {
    const trades: TradeEntry[] = [createTrade()];
    const summaries: TradeConfirmationSummary[] = [];

    const result = attributeFees(trades, summaries);

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].feesAttributed).toBe(false);
    expect(result.totalFeesAvailable).toBe(0);
    expect(result.unattributedFees).toBe(0);
  });

  it("should update trade.fees field with totalFees", () => {
    const trades: TradeEntry[] = [createTrade()];
    const summaries: TradeConfirmationSummary[] = [
      createSummary({ totalFees: 0.15, commissions: 0.15, exchangeFees: 0, nfaFees: 0 }),
    ];

    const result = attributeFees(trades, summaries);

    // Both totalFees and base fees field should be updated
    expect(result.trades[0].totalFees).toBeCloseTo(0.15, 4);
    expect(result.trades[0].fees).toBeCloseTo(0.15, 4);
  });

  it("should calculate correct totals", () => {
    const trades: TradeEntry[] = [
      createTrade({ symbol: "S1", quantity: 10 }),
      createTrade({ symbol: "S2", date: "2024-09-04", quantity: 10 }),
    ];

    const summaries: TradeConfirmationSummary[] = [
      createSummary({ symbol: "S1", totalFees: 0.10, commissions: 0.10, exchangeFees: 0, nfaFees: 0 }),
      createSummary({ symbol: "S2", totalFees: 0.20, commissions: 0.20, exchangeFees: 0, nfaFees: 0 }),
    ];

    const result = attributeFees(trades, summaries);

    expect(result.totalFeesAvailable).toBeCloseTo(0.30, 4);
    expect(result.totalFeesAttributed).toBeCloseTo(0.30, 4);
    expect(result.unattributedFees).toBeCloseTo(0, 4);
  });
});

// ============================================================================
// VALIDATE FEE ATTRIBUTION TESTS
// ============================================================================

describe("validateFeeAttribution", () => {
  it("should return valid when fees match exactly", () => {
    const result = validateFeeAttribution(1.50, 1.50);

    expect(result.isValid).toBe(true);
    expect(result.discrepancy).toBe(0);
    expect(result.message).toContain("validated");
  });

  it("should return valid within default tolerance", () => {
    const result = validateFeeAttribution(1.505, 1.50);

    expect(result.isValid).toBe(true);
    expect(result.discrepancy).toBeCloseTo(0.005, 4);
  });

  it("should return invalid when exceeding tolerance", () => {
    const result = validateFeeAttribution(1.50, 1.60);

    expect(result.isValid).toBe(false);
    expect(result.discrepancy).toBeCloseTo(0.10, 4);
    expect(result.message).toContain("discrepancy");
  });

  it("should use custom tolerance when provided", () => {
    const result = validateFeeAttribution(1.50, 1.60, 0.15);

    expect(result.isValid).toBe(true); // Within $0.15 tolerance
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe("initializeTradeWithFees", () => {
  it("should create TradeWithFees with zero fees", () => {
    const trade = createTrade();
    const result = initializeTradeWithFees(trade);

    expect(result.commissionFees).toBe(0);
    expect(result.exchangeFees).toBe(0);
    expect(result.nfaFees).toBe(0);
    expect(result.totalFees).toBe(0);
    expect(result.feesAttributed).toBe(false);

    // Original trade properties preserved
    expect(result.symbol).toBe(trade.symbol);
    expect(result.quantity).toBe(trade.quantity);
  });
});

describe("getTotalTradesFees", () => {
  it("should sum fees from all trades", () => {
    const trades: TradeWithFees[] = [
      { ...createTrade(), commissionFees: 0.05, exchangeFees: 0.02, nfaFees: 0.01, totalFees: 0.08, feesAttributed: true },
      { ...createTrade(), commissionFees: 0.10, exchangeFees: 0.04, nfaFees: 0.02, totalFees: 0.16, feesAttributed: true },
    ];

    expect(getTotalTradesFees(trades)).toBeCloseTo(0.24, 4);
  });

  it("should return 0 for empty array", () => {
    expect(getTotalTradesFees([])).toBe(0);
  });
});

describe("getTradesFeeBreakdown", () => {
  it("should break down fees by type", () => {
    const trades: TradeWithFees[] = [
      { ...createTrade(), commissionFees: 0.10, exchangeFees: 0.05, nfaFees: 0.02, totalFees: 0.17, feesAttributed: true },
      { ...createTrade(), commissionFees: 0.20, exchangeFees: 0.10, nfaFees: 0.04, totalFees: 0.34, feesAttributed: true },
    ];

    const breakdown = getTradesFeeBreakdown(trades);

    expect(breakdown.commissions).toBeCloseTo(0.30, 4);
    expect(breakdown.exchangeFees).toBeCloseTo(0.15, 4);
    expect(breakdown.nfaFees).toBeCloseTo(0.06, 4);
    expect(breakdown.total).toBeCloseTo(0.51, 4);
  });
});

describe("getUnattributedTrades", () => {
  it("should return trades without fees attributed", () => {
    const trades: TradeWithFees[] = [
      { ...createTrade(), commissionFees: 0.05, exchangeFees: 0, nfaFees: 0, totalFees: 0.05, feesAttributed: true },
      { ...createTrade(), commissionFees: 0, exchangeFees: 0, nfaFees: 0, totalFees: 0, feesAttributed: false },
      { ...createTrade(), commissionFees: 0, exchangeFees: 0, nfaFees: 0, totalFees: 0, feesAttributed: false },
    ];

    const unattributed = getUnattributedTrades(trades);

    expect(unattributed).toHaveLength(2);
    expect(unattributed.every(t => !t.feesAttributed)).toBe(true);
  });

  it("should return empty array when all trades have fees", () => {
    const trades: TradeWithFees[] = [
      { ...createTrade(), commissionFees: 0.05, exchangeFees: 0, nfaFees: 0, totalFees: 0.05, feesAttributed: true },
    ];

    expect(getUnattributedTrades(trades)).toHaveLength(0);
  });
});

describe("calculateFeeRate", () => {
  it("should calculate fees as percentage of trade value", () => {
    const trades: TradeWithFees[] = [
      // Trade value: 10 * 0.50 = $5.00
      { ...createTrade({ quantity: 10, price: 0.50 }), commissionFees: 0.05, exchangeFees: 0, nfaFees: 0, totalFees: 0.05, feesAttributed: true },
    ];

    // Fee rate: 0.05 / 5.00 = 0.01 = 1%
    expect(calculateFeeRate(trades)).toBeCloseTo(0.01, 4);
  });

  it("should handle multiple trades", () => {
    const trades: TradeWithFees[] = [
      // Trade 1: value = $5.00, fees = $0.05
      { ...createTrade({ quantity: 10, price: 0.50 }), commissionFees: 0, exchangeFees: 0, nfaFees: 0, totalFees: 0.05, feesAttributed: true },
      // Trade 2: value = $10.00, fees = $0.10
      { ...createTrade({ quantity: 20, price: 0.50 }), commissionFees: 0, exchangeFees: 0, nfaFees: 0, totalFees: 0.10, feesAttributed: true },
    ];

    // Total value: $15.00, Total fees: $0.15
    // Fee rate: 0.15 / 15.00 = 0.01 = 1%
    expect(calculateFeeRate(trades)).toBeCloseTo(0.01, 4);
  });

  it("should return 0 for empty trades", () => {
    expect(calculateFeeRate([])).toBe(0);
  });

  it("should return 0 when total value is 0", () => {
    const trades: TradeWithFees[] = [
      { ...createTrade({ quantity: 0, price: 0 }), commissionFees: 0, exchangeFees: 0, nfaFees: 0, totalFees: 0.05, feesAttributed: true },
    ];

    expect(calculateFeeRate(trades)).toBe(0);
  });
});
