/**
 * Section 7 Parser Tests
 *
 * Tests for Open Position utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  toOpenPositionRow,
  getTotalOpenQuantity,
  getTotalUnrealizedPnl,
  getTotalMarketValue,
  getPositionQuantity,
  filterBySymbol,
  filterBySide,
  groupBySymbol,
  isExpiringSoon,
  type OpenPosition,
} from "@/lib/parsing/sections/section7";

// ============================================================================
// HELPERS
// ============================================================================

function makePosition(
  overrides: Partial<OpenPosition> = {}
): OpenPosition {
  return {
    dateOpened: "2024-09-04",
    accountType: "SW",
    qtyBuy: 10,
    qtySell: 0,
    subtype: "YES",
    symbol: "KXBTC-24SEP10-55000-T5999.99",
    exchange: "Kalshi",
    expDate: "2024-09-10",
    tradePrice: 0.65,
    currency: "USD",
    settlementPrice: 0.70,
    tradeType: "event contract",
    description: "Event Contract",
    ...overrides,
  };
}

// ============================================================================
// CONVERSION
// ============================================================================

describe("toOpenPositionRow", () => {
  it("should convert YES position with correct unrealized P&L", () => {
    const pos = makePosition({ subtype: "YES", tradePrice: 0.60, settlementPrice: 0.75, qtyBuy: 10 });
    const row = toOpenPositionRow(pos, "2024-09-04");
    expect(row.symbol).toBe(pos.symbol);
    expect(row.side).toBe("YES");
    expect(row.quantity).toBe(10);
    expect(row.costBasis).toBe(0.60);
    expect(row.currentPrice).toBe(0.75);
    // YES: (current - cost) * qty = (0.75 - 0.60) * 10 = 1.50
    expect(row.unrealizedPnl).toBeCloseTo(1.50);
    expect(row.marketValue).toBeCloseTo(7.50);
  });

  it("should convert NO position with correct unrealized P&L", () => {
    const pos = makePosition({ subtype: "NO", tradePrice: 0.40, settlementPrice: 0.30, qtyBuy: 0, qtySell: 5 });
    const row = toOpenPositionRow(pos, "2024-09-04");
    expect(row.side).toBe("NO");
    expect(row.quantity).toBe(5);
    // NO: (cost - current) * qty = (0.40 - 0.30) * 5 = 0.50
    expect(row.unrealizedPnl).toBeCloseTo(0.50);
  });

  it("should use tradePrice when settlementPrice is null", () => {
    const pos = makePosition({ tradePrice: 0.65, settlementPrice: null });
    const row = toOpenPositionRow(pos, "2024-09-04");
    expect(row.currentPrice).toBe(0.65);
    expect(row.unrealizedPnl).toBe(0); // same as cost basis
  });
});

// ============================================================================
// AGGREGATION
// ============================================================================

describe("getTotalOpenQuantity", () => {
  it("should sum all quantities", () => {
    const positions = [
      makePosition({ qtyBuy: 10, qtySell: 0 }),
      makePosition({ qtyBuy: 0, qtySell: 5 }),
      makePosition({ qtyBuy: 20, qtySell: 0 }),
    ];
    expect(getTotalOpenQuantity(positions)).toBe(35);
  });
});

describe("getPositionQuantity", () => {
  it("should return qtyBuy when positive", () => {
    expect(getPositionQuantity(makePosition({ qtyBuy: 10, qtySell: 0 }))).toBe(10);
  });

  it("should return qtySell when qtyBuy is zero", () => {
    expect(getPositionQuantity(makePosition({ qtyBuy: 0, qtySell: 5 }))).toBe(5);
  });
});

describe("getTotalUnrealizedPnl", () => {
  it("should sum unrealized P&L across positions", () => {
    const positions = [
      makePosition({ subtype: "YES", tradePrice: 0.50, settlementPrice: 0.70, qtyBuy: 10 }),
      makePosition({ subtype: "YES", tradePrice: 0.60, settlementPrice: 0.55, qtyBuy: 10 }),
    ];
    // Pos1: (0.70-0.50)*10 = 2.00, Pos2: (0.55-0.60)*10 = -0.50
    const total = getTotalUnrealizedPnl(positions);
    expect(total).toBeCloseTo(1.50);
  });
});

describe("getTotalMarketValue", () => {
  it("should sum market values", () => {
    const positions = [
      makePosition({ tradePrice: 0.50, settlementPrice: 0.70, qtyBuy: 10 }),
      makePosition({ tradePrice: 0.60, settlementPrice: 0.80, qtyBuy: 5 }),
    ];
    // Pos1: 0.70*10=7.0, Pos2: 0.80*5=4.0
    expect(getTotalMarketValue(positions)).toBeCloseTo(11.0);
  });
});

// ============================================================================
// FILTERING
// ============================================================================

describe("filterBySymbol", () => {
  it("should filter positions by regex pattern", () => {
    const positions = [
      makePosition({ symbol: "KXBTC-24SEP04" }),
      makePosition({ symbol: "KXETH-24SEP04" }),
      makePosition({ symbol: "KXBTC-24SEP05" }),
    ];
    expect(filterBySymbol(positions, /KXBTC/)).toHaveLength(2);
    expect(filterBySymbol(positions, /KXETH/)).toHaveLength(1);
    expect(filterBySymbol(positions, /NOSYM/)).toHaveLength(0);
  });
});

describe("filterBySide", () => {
  it("should filter positions by side", () => {
    const positions = [
      makePosition({ subtype: "YES" }),
      makePosition({ subtype: "NO" }),
      makePosition({ subtype: "YES" }),
    ];
    expect(filterBySide(positions, "YES")).toHaveLength(2);
    expect(filterBySide(positions, "NO")).toHaveLength(1);
  });
});

describe("groupBySymbol", () => {
  it("should group positions by symbol", () => {
    const positions = [
      makePosition({ symbol: "SYM-A" }),
      makePosition({ symbol: "SYM-B" }),
      makePosition({ symbol: "SYM-A" }),
    ];
    const groups = groupBySymbol(positions);
    expect(groups.get("SYM-A")).toHaveLength(2);
    expect(groups.get("SYM-B")).toHaveLength(1);
  });
});

// ============================================================================
// EXPIRATION
// ============================================================================

describe("isExpiringSoon", () => {
  it("should return false when no expDate", () => {
    expect(isExpiringSoon(makePosition({ expDate: null }))).toBe(false);
  });

  it("should return true for positions expiring within threshold", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expDate = tomorrow.toISOString().split("T")[0];
    expect(isExpiringSoon(makePosition({ expDate }), 7)).toBe(true);
  });

  it("should return false for expired positions", () => {
    expect(isExpiringSoon(makePosition({ expDate: "2020-01-01" }), 7)).toBe(false);
  });
});
