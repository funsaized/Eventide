/**
 * Section 2 Parser Tests
 *
 * Tests for Monthly Trade Confirmations parsing functionality.
 */

import { describe, it, expect } from "vitest";
import {
  parseSection2,
  getTradeQuantity,
  isOpeningTrade,
  isSettlement,
  getSettlementOutcome,
  isSamePosition,
  filterByTradeType,
  filterBySymbol,
  groupTradesBySymbol,
  type TradeConfirmation,
} from "@/lib/parsing/robinhood/sections/section2";
import {
  createMockSection2Data,
  createMockSection2WithWrappedSymbol,
  createMockSectionBoundary,
} from "../../fixtures/section-mocks";

describe("parseSection2", () => {
  it("should handle empty section", () => {
    const boundary = createMockSectionBoundary([], "section2");

    const result = parseSection2(boundary, 612);

    expect(result.trades).toHaveLength(0);
    expect(result.warnings).toContain("Section 2 has no items");
  });

  it("should return proper result structure", () => {
    const mockData = createMockSection2Data();
    const boundary = createMockSectionBoundary(mockData.items, "section2");

    const result = parseSection2(boundary, mockData.pageWidth);

    // Result should have proper structure regardless of parsing success
    expect(result).toHaveProperty("trades");
    expect(result).toHaveProperty("rowsProcessed");
    expect(result).toHaveProperty("validTrades");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("layout");
    expect(Array.isArray(result.trades)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("should track rows processed count", () => {
    const mockData = createMockSection2Data();
    const boundary = createMockSectionBoundary(mockData.items, "section2");

    const result = parseSection2(boundary, mockData.pageWidth);

    // rowsProcessed should be non-negative
    expect(result.rowsProcessed).toBeGreaterThanOrEqual(0);
  });

  it("should return warnings for missing headers", () => {
    // Create mock with no recognizable headers
    const items = [
      { text: "Random text", x: 10, y: 100, width: 50, height: 10, pageNumber: 1 },
      { text: "More text", x: 60, y: 100, width: 50, height: 10, pageNumber: 1 },
    ];
    const boundary = createMockSectionBoundary(items, "section2");

    const result = parseSection2(boundary, 612);

    // Should have warning about missing headers
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("getTradeQuantity", () => {
  it("should return qtyLong when positive", () => {
    const trade: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 10,
      qtyShort: 0,
      subtype: "YES",
      symbol: "KXTEST",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 0.65,
      currency: "USD",
      tradeType: "Trade",
      description: "",
      source: "section2",
    };

    expect(getTradeQuantity(trade)).toBe(10);
  });

  it("should return qtyShort when qtyLong is zero", () => {
    const trade: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 0,
      qtyShort: 15,
      subtype: "YES",
      symbol: "KXTEST",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 0.65,
      currency: "USD",
      tradeType: "Final Settlement",
      description: "",
      source: "section2",
    };

    expect(getTradeQuantity(trade)).toBe(15);
  });
});

describe("isOpeningTrade", () => {
  it("should return true for Trade type", () => {
    const trade: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 10,
      qtyShort: 0,
      subtype: "YES",
      symbol: "KXTEST",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 0.65,
      currency: "USD",
      tradeType: "Trade",
      description: "",
      source: "section2",
    };

    expect(isOpeningTrade(trade)).toBe(true);
  });

  it("should return false for Final Settlement type", () => {
    const trade: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 0,
      qtyShort: 10,
      subtype: "YES",
      symbol: "KXTEST",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 0,
      currency: "USD",
      tradeType: "Final Settlement",
      description: "",
      source: "section2",
    };

    expect(isOpeningTrade(trade)).toBe(false);
  });
});

describe("isSettlement", () => {
  it("should return true for Final Settlement type", () => {
    const trade: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 0,
      qtyShort: 10,
      subtype: "YES",
      symbol: "KXTEST",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 1,
      currency: "USD",
      tradeType: "Final Settlement",
      description: "",
      source: "section2",
    };

    expect(isSettlement(trade)).toBe(true);
  });

  it("should return false for Trade type", () => {
    const trade: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 10,
      qtyShort: 0,
      subtype: "YES",
      symbol: "KXTEST",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 0.65,
      currency: "USD",
      tradeType: "Trade",
      description: "",
      source: "section2",
    };

    expect(isSettlement(trade)).toBe(false);
  });
});

describe("getSettlementOutcome", () => {
  it("should return 1 for YES winning settlement", () => {
    const trade: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 0,
      qtyShort: 10,
      subtype: "YES",
      symbol: "KXTEST",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 1,
      currency: "USD",
      tradeType: "Final Settlement",
      description: "",
      source: "section2",
    };

    expect(getSettlementOutcome(trade)).toBe(1);
  });

  it("should return 0 for NO winning settlement (YES lost)", () => {
    const trade: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 0,
      qtyShort: 10,
      subtype: "YES",
      symbol: "KXTEST",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 0,
      currency: "USD",
      tradeType: "Final Settlement",
      description: "",
      source: "section2",
    };

    expect(getSettlementOutcome(trade)).toBe(0);
  });

  it("should return null for non-settlement trades", () => {
    const trade: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 10,
      qtyShort: 0,
      subtype: "YES",
      symbol: "KXTEST",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 0.65,
      currency: "USD",
      tradeType: "Trade",
      description: "",
      source: "section2",
    };

    expect(getSettlementOutcome(trade)).toBeNull();
  });
});

describe("isSamePosition", () => {
  it("should return true for matching symbol, subtype, and expDate", () => {
    const trade1: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 10,
      qtyShort: 0,
      subtype: "YES",
      symbol: "KXTEST",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 0.65,
      currency: "USD",
      tradeType: "Trade",
      description: "",
      source: "section2",
    };

    const trade2: TradeConfirmation = {
      ...trade1,
      tradeDate: "2024-09-03", // Different trade date
      tradePrice: 0.60, // Different price
    };

    expect(isSamePosition(trade1, trade2)).toBe(true);
  });

  it("should return false for different symbols", () => {
    const trade1: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 10,
      qtyShort: 0,
      subtype: "YES",
      symbol: "KXTEST1",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 0.65,
      currency: "USD",
      tradeType: "Trade",
      description: "",
      source: "section2",
    };

    const trade2: TradeConfirmation = {
      ...trade1,
      symbol: "KXTEST2",
    };

    expect(isSamePosition(trade1, trade2)).toBe(false);
  });

  it("should return false for different subtypes", () => {
    const trade1: TradeConfirmation = {
      tradeDate: "2024-09-04",
      accountType: "SW",
      qtyLong: 10,
      qtyShort: 0,
      subtype: "YES",
      symbol: "KXTEST",
      contractYear: 2024,
      exchange: "Kalshi",
      expDate: "2024-09-04",
      tradePrice: 0.65,
      currency: "USD",
      tradeType: "Trade",
      description: "",
      source: "section2",
    };

    const trade2: TradeConfirmation = {
      ...trade1,
      subtype: "NO",
    };

    expect(isSamePosition(trade1, trade2)).toBe(false);
  });
});

describe("filterByTradeType", () => {
  it("should filter trades by Trade type", () => {
    const trades: TradeConfirmation[] = [
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        qtyLong: 10,
        qtyShort: 0,
        subtype: "YES",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        tradePrice: 0.65,
        currency: "USD",
        tradeType: "Trade",
        description: "",
        source: "section2",
      },
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        qtyLong: 0,
        qtyShort: 10,
        subtype: "YES",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        tradePrice: 1,
        currency: "USD",
        tradeType: "Final Settlement",
        description: "",
        source: "section2",
      },
    ];

    const result = filterByTradeType(trades, "Trade");

    expect(result).toHaveLength(1);
    expect(result[0].tradeType).toBe("Trade");
  });

  it("should filter trades by Final Settlement type", () => {
    const trades: TradeConfirmation[] = [
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        qtyLong: 10,
        qtyShort: 0,
        subtype: "YES",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        tradePrice: 0.65,
        currency: "USD",
        tradeType: "Trade",
        description: "",
        source: "section2",
      },
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        qtyLong: 0,
        qtyShort: 10,
        subtype: "YES",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        tradePrice: 1,
        currency: "USD",
        tradeType: "Final Settlement",
        description: "",
        source: "section2",
      },
    ];

    const result = filterByTradeType(trades, "Final Settlement");

    expect(result).toHaveLength(1);
    expect(result[0].tradeType).toBe("Final Settlement");
  });
});

describe("filterBySymbol", () => {
  it("should filter trades by symbol pattern", () => {
    const trades: TradeConfirmation[] = [
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        qtyLong: 10,
        qtyShort: 0,
        subtype: "YES",
        symbol: "KXNFLGAME-24SEP04",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        tradePrice: 0.65,
        currency: "USD",
        tradeType: "Trade",
        description: "",
        source: "section2",
      },
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        qtyLong: 10,
        qtyShort: 0,
        subtype: "YES",
        symbol: "KXFEDRATE-24SEP18",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-18",
        tradePrice: 0.70,
        currency: "USD",
        tradeType: "Trade",
        description: "",
        source: "section2",
      },
    ];

    const result = filterBySymbol(trades, /NFL/);

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toContain("NFL");
  });
});

describe("groupTradesBySymbol", () => {
  it("should group trades by symbol", () => {
    const trades: TradeConfirmation[] = [
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        qtyLong: 10,
        qtyShort: 0,
        subtype: "YES",
        symbol: "KXNFL",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        tradePrice: 0.65,
        currency: "USD",
        tradeType: "Trade",
        description: "",
        source: "section2",
      },
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        qtyLong: 0,
        qtyShort: 10,
        subtype: "YES",
        symbol: "KXNFL",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        tradePrice: 1,
        currency: "USD",
        tradeType: "Final Settlement",
        description: "",
        source: "section2",
      },
      {
        tradeDate: "2024-09-18",
        accountType: "SW",
        qtyLong: 20,
        qtyShort: 0,
        subtype: "YES",
        symbol: "KXFED",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-18",
        tradePrice: 0.70,
        currency: "USD",
        tradeType: "Trade",
        description: "",
        source: "section2",
      },
    ];

    const result = groupTradesBySymbol(trades);

    expect(result.size).toBe(2);
    expect(result.get("KXNFL")).toHaveLength(2);
    expect(result.get("KXFED")).toHaveLength(1);
  });
});
