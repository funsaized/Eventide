/**
 * Section 3 Parser Tests
 *
 * Tests for Trade Confirmation Summary utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  getFeesForSymbolDate,
  getTotalFeesForSymbol,
  getTotalFees,
  groupBySymbol,
  groupBySymbolAndDate,
  getFeeBreakdown,
  type TradeConfirmationSummary,
} from "@/lib/parsing/sections/section3";

// ============================================================================
// HELPERS
// ============================================================================

function makeSummary(
  overrides: Partial<TradeConfirmationSummary> = {}
): TradeConfirmationSummary {
  return {
    tradeDate: "2024-09-04",
    accountType: "SW",
    totalQtyLong: 10,
    totalQtyShort: 0,
    subtype: "YES",
    symbol: "KXBTC-24SEP04-55000-T5999.99",
    exchange: "Kalshi",
    expDate: "2024-09-05",
    commissions: 0.0,
    exchangeFees: 0.07,
    nfaFees: 0.02,
    totalFees: 0.09,
    currency: "USD",
    description: "Event Contract",
    ...overrides,
  };
}

// ============================================================================
// FEE QUERIES
// ============================================================================

describe("getFeesForSymbolDate", () => {
  it("should return fees for matching symbol and date", () => {
    const summaries = [
      makeSummary({ symbol: "SYM-A", tradeDate: "2024-09-01", totalFees: 0.10 }),
      makeSummary({ symbol: "SYM-A", tradeDate: "2024-09-02", totalFees: 0.20 }),
      makeSummary({ symbol: "SYM-B", tradeDate: "2024-09-01", totalFees: 0.30 }),
    ];
    expect(getFeesForSymbolDate(summaries, "SYM-A", "2024-09-01")).toBeCloseTo(0.10);
  });

  it("should return 0 for no matches", () => {
    const summaries = [makeSummary({ symbol: "SYM-A", totalFees: 0.10 })];
    expect(getFeesForSymbolDate(summaries, "SYM-Z", "2024-09-01")).toBe(0);
  });

  it("should sum fees when multiple summaries match", () => {
    const summaries = [
      makeSummary({ symbol: "SYM-A", tradeDate: "2024-09-01", totalFees: 0.10 }),
      makeSummary({ symbol: "SYM-A", tradeDate: "2024-09-01", totalFees: 0.15 }),
    ];
    expect(getFeesForSymbolDate(summaries, "SYM-A", "2024-09-01")).toBeCloseTo(0.25);
  });
});

describe("getTotalFeesForSymbol", () => {
  it("should sum fees across all dates for a symbol", () => {
    const summaries = [
      makeSummary({ symbol: "SYM-A", tradeDate: "2024-09-01", totalFees: 0.10 }),
      makeSummary({ symbol: "SYM-A", tradeDate: "2024-09-02", totalFees: 0.20 }),
      makeSummary({ symbol: "SYM-B", totalFees: 0.30 }),
    ];
    expect(getTotalFeesForSymbol(summaries, "SYM-A")).toBeCloseTo(0.30);
  });
});

describe("getTotalFees", () => {
  it("should sum all fees", () => {
    const summaries = [
      makeSummary({ totalFees: 0.10 }),
      makeSummary({ totalFees: 0.20 }),
      makeSummary({ totalFees: 0.05 }),
    ];
    expect(getTotalFees(summaries)).toBeCloseTo(0.35);
  });

  it("should return 0 for empty array", () => {
    expect(getTotalFees([])).toBe(0);
  });
});

// ============================================================================
// GROUPING
// ============================================================================

describe("groupBySymbol", () => {
  it("should group summaries by symbol", () => {
    const summaries = [
      makeSummary({ symbol: "SYM-A" }),
      makeSummary({ symbol: "SYM-B" }),
      makeSummary({ symbol: "SYM-A" }),
    ];
    const groups = groupBySymbol(summaries);
    expect(groups.get("SYM-A")).toHaveLength(2);
    expect(groups.get("SYM-B")).toHaveLength(1);
  });

  it("should return empty map for empty input", () => {
    expect(groupBySymbol([]).size).toBe(0);
  });
});

describe("groupBySymbolAndDate", () => {
  it("should group by symbol|date key", () => {
    const summaries = [
      makeSummary({ symbol: "SYM-A", tradeDate: "2024-09-01" }),
      makeSummary({ symbol: "SYM-A", tradeDate: "2024-09-02" }),
      makeSummary({ symbol: "SYM-A", tradeDate: "2024-09-01" }),
    ];
    const groups = groupBySymbolAndDate(summaries);
    expect(groups.get("SYM-A|2024-09-01")).toHaveLength(2);
    expect(groups.get("SYM-A|2024-09-02")).toHaveLength(1);
  });
});

describe("getFeeBreakdown", () => {
  it("should return fee component totals", () => {
    const summaries = [
      makeSummary({ commissions: 1.00, exchangeFees: 0.50, nfaFees: 0.10, totalFees: 1.60 }),
      makeSummary({ commissions: 2.00, exchangeFees: 1.00, nfaFees: 0.20, totalFees: 3.20 }),
    ];
    const breakdown = getFeeBreakdown(summaries);
    expect(breakdown.commissions).toBeCloseTo(3.00);
    expect(breakdown.exchangeFees).toBeCloseTo(1.50);
    expect(breakdown.nfaFees).toBeCloseTo(0.30);
    expect(breakdown.total).toBeCloseTo(4.80);
  });

  it("should return zeros for empty input", () => {
    const breakdown = getFeeBreakdown([]);
    expect(breakdown.commissions).toBe(0);
    expect(breakdown.exchangeFees).toBe(0);
    expect(breakdown.nfaFees).toBe(0);
    expect(breakdown.total).toBe(0);
  });
});
