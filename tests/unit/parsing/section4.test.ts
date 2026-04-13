/**
 * Section 4 Parser Tests
 *
 * Tests for Purchase and Sale deduplication utilities.
 */

import { describe, it, expect } from "vitest";
import {
  areTradesDuplicate,
  mergeTradesWithDeduplication,
  getUniqueTradesFromSections,
  type PurchaseSaleTrade,
} from "@/lib/parsing/robinhood/sections/section4";
import type { TradeConfirmation } from "@/lib/parsing/robinhood/sections/section2";

// ============================================================================
// HELPERS
// ============================================================================

function makeS2Trade(
  overrides: Partial<TradeConfirmation> = {}
): TradeConfirmation {
  return {
    tradeDate: "2024-09-04",
    accountType: "SW",
    qtyLong: 10,
    qtyShort: 0,
    subtype: "YES",
    symbol: "KXBTC-24SEP04-55000-T5999.99",
    contractYear: 2024,
    exchange: "Kalshi",
    expDate: "2024-09-05",
    tradePrice: 0.65,
    currency: "USD",
    tradeType: "Trade",
    description: "Event Contract",
    source: "section2",
    ...overrides,
  };
}

function makeS4Trade(
  overrides: Partial<PurchaseSaleTrade> = {}
): PurchaseSaleTrade {
  return {
    ...makeS2Trade({ source: "section4" }),
    isPriorPeriod: false,
    ...overrides,
  };
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

describe("areTradesDuplicate", () => {
  it("should detect identical trades as duplicates", () => {
    const t1 = makeS2Trade();
    const t2 = makeS2Trade();
    expect(areTradesDuplicate(t1, t2)).toBe(true);
  });

  it("should not consider different dates as duplicates", () => {
    const t1 = makeS2Trade({ tradeDate: "2024-09-01" });
    const t2 = makeS2Trade({ tradeDate: "2024-09-02" });
    expect(areTradesDuplicate(t1, t2)).toBe(false);
  });

  it("should not consider different symbols as duplicates", () => {
    const t1 = makeS2Trade({ symbol: "SYM-A" });
    const t2 = makeS2Trade({ symbol: "SYM-B" });
    expect(areTradesDuplicate(t1, t2)).toBe(false);
  });

  it("should not consider different sides as duplicates", () => {
    const t1 = makeS2Trade({ subtype: "YES" });
    const t2 = makeS2Trade({ subtype: "NO" });
    expect(areTradesDuplicate(t1, t2)).toBe(false);
  });

  it("should not consider different prices as duplicates", () => {
    const t1 = makeS2Trade({ tradePrice: 0.65 });
    const t2 = makeS2Trade({ tradePrice: 0.70 });
    expect(areTradesDuplicate(t1, t2)).toBe(false);
  });

  it("should not consider different quantities as duplicates", () => {
    const t1 = makeS2Trade({ qtyLong: 10 });
    const t2 = makeS2Trade({ qtyLong: 20 });
    expect(areTradesDuplicate(t1, t2)).toBe(false);
  });

  it("should ignore tradeType differences (by design)", () => {
    const t1 = makeS2Trade({ tradeType: "Trade" });
    const t2 = makeS2Trade({ tradeType: "Final Settlement" });
    expect(areTradesDuplicate(t1, t2)).toBe(true);
  });
});

describe("mergeTradesWithDeduplication", () => {
  it("should keep all S2 trades and remove S4 duplicates", () => {
    const s2 = [makeS2Trade({ symbol: "SYM-A" })];
    const s4 = [makeS4Trade({ symbol: "SYM-A" })];
    const result = mergeTradesWithDeduplication(s2, s4);
    expect(result.mergedTrades).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(1);
  });

  it("should add S4 trades not in S2", () => {
    const s2 = [makeS2Trade({ symbol: "SYM-A" })];
    const s4 = [makeS4Trade({ symbol: "SYM-B", isPriorPeriod: true })];
    const result = mergeTradesWithDeduplication(s2, s4);
    expect(result.mergedTrades).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it("should handle empty S2", () => {
    const s4 = [makeS4Trade({ symbol: "SYM-A" })];
    const result = mergeTradesWithDeduplication([], s4);
    expect(result.mergedTrades).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it("should handle empty S4", () => {
    const s2 = [makeS2Trade({ symbol: "SYM-A" })];
    const result = mergeTradesWithDeduplication(s2, []);
    expect(result.mergedTrades).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it("should handle both empty", () => {
    const result = mergeTradesWithDeduplication([], []);
    expect(result.mergedTrades).toHaveLength(0);
    expect(result.duplicatesRemoved).toBe(0);
  });
});

describe("getUniqueTradesFromSections", () => {
  it("should combine S2 trades with S4 prior period trades", () => {
    const s2 = [makeS2Trade({ symbol: "SYM-A" })];
    const s4Result = {
      trades: [
        makeS4Trade({ symbol: "SYM-A", isPriorPeriod: false }),
        makeS4Trade({ symbol: "SYM-B", isPriorPeriod: true }),
      ],
      currentPeriodTrades: [makeS4Trade({ symbol: "SYM-A", isPriorPeriod: false })],
      priorPeriodTrades: [makeS4Trade({ symbol: "SYM-B", isPriorPeriod: true })],
      rowsProcessed: 2,
      validTrades: 2,
      warnings: [],
      layout: null,
    };
    const result = getUniqueTradesFromSections(s2, s4Result);
    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe("SYM-A");
    expect(result[1].symbol).toBe("SYM-B");
  });
});
