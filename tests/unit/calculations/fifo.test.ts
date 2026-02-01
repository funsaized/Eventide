/**
 * FIFO Cost Basis Calculation Tests
 *
 * Tests for First-In-First-Out P&L calculation for event contracts.
 */

import { describe, it, expect } from "vitest";
import {
  PositionLedger,
  calculateFifo,
  calculateAllPositions,
  aggregateBySymbol,
  getTotalPnl,
  getWinLossStats,
  type TradeEntry,
} from "@/lib/calculations/fifo";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTradeEntry(
  overrides: Partial<TradeEntry> = {}
): TradeEntry {
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

// ============================================================================
// POSITION LEDGER TESTS
// ============================================================================

describe("PositionLedger", () => {
  describe("addOpeningTrade", () => {
    it("should add opening trade to ledger", () => {
      const ledger = new PositionLedger();
      const trade = createTradeEntry({ quantity: 10, price: 0.65 });

      ledger.addOpeningTrade(trade);

      const lots = ledger.getOpenLots("KXTEST-24SEP04", "YES");
      expect(lots).toHaveLength(1);
      expect(lots[0].quantity).toBe(10);
      expect(lots[0].price).toBe(0.65);
    });

    it("should add multiple lots for same symbol", () => {
      const ledger = new PositionLedger();

      ledger.addOpeningTrade(createTradeEntry({ date: "2024-09-01", price: 0.60 }));
      ledger.addOpeningTrade(createTradeEntry({ date: "2024-09-02", price: 0.65 }));
      ledger.addOpeningTrade(createTradeEntry({ date: "2024-09-03", price: 0.70 }));

      const lots = ledger.getOpenLots("KXTEST-24SEP04", "YES");
      expect(lots).toHaveLength(3);
    });

    it("should track fees with opening trade", () => {
      const ledger = new PositionLedger();
      const trade = createTradeEntry({ quantity: 10, fees: 0.10 });

      ledger.addOpeningTrade(trade);

      const lots = ledger.getOpenLots("KXTEST-24SEP04", "YES");
      expect(lots[0].fees).toBe(0.10);
    });
  });

  describe("closePosition", () => {
    it("should close position using FIFO order", () => {
      const ledger = new PositionLedger();

      // Add lots at different prices
      ledger.addOpeningTrade(createTradeEntry({ date: "2024-09-01", price: 0.60, quantity: 10 }));
      ledger.addOpeningTrade(createTradeEntry({ date: "2024-09-02", price: 0.70, quantity: 10 }));

      // Close 15 contracts - should use all of first lot and half of second
      const closingTrade = createTradeEntry({
        date: "2024-09-05",
        type: "CLOSE",
        quantity: 15,
        price: 1.00, // Full win
      });

      const closedLots = ledger.closePosition(closingTrade);

      expect(closedLots).toHaveLength(2);
      // First lot: 10 contracts at 0.60
      expect(closedLots[0].entryPrice).toBe(0.60);
      expect(closedLots[0].quantity).toBe(10);
      // Second lot: 5 contracts at 0.70
      expect(closedLots[1].entryPrice).toBe(0.70);
      expect(closedLots[1].quantity).toBe(5);
    });

    it("should calculate gross P&L correctly for YES winning", () => {
      const ledger = new PositionLedger();

      ledger.addOpeningTrade(createTradeEntry({ price: 0.65, quantity: 10 }));

      const closingTrade = createTradeEntry({
        type: "SETTLE",
        quantity: 10,
        settlementPrice: 1.00, // YES wins
      });

      const closedLots = ledger.closePosition(closingTrade);

      // P&L = 10 * (1.00 - 0.65) = 3.50
      expect(closedLots[0].grossPnl).toBeCloseTo(3.50, 2);
    });

    it("should calculate gross P&L correctly for YES losing", () => {
      const ledger = new PositionLedger();

      ledger.addOpeningTrade(createTradeEntry({ price: 0.65, quantity: 10 }));

      const closingTrade = createTradeEntry({
        type: "SETTLE",
        quantity: 10,
        settlementPrice: 0, // YES loses
      });

      const closedLots = ledger.closePosition(closingTrade);

      // P&L = 10 * (0 - 0.65) = -6.50
      expect(closedLots[0].grossPnl).toBeCloseTo(-6.50, 2);
    });

    it("should handle partial lot closures", () => {
      const ledger = new PositionLedger();

      ledger.addOpeningTrade(createTradeEntry({ quantity: 20, price: 0.50 }));

      const closingTrade = createTradeEntry({
        type: "CLOSE",
        quantity: 5,
        price: 0.80,
      });

      ledger.closePosition(closingTrade);

      const remainingLots = ledger.getOpenLots("KXTEST-24SEP04", "YES");
      expect(remainingLots).toHaveLength(1);
      expect(remainingLots[0].quantity).toBe(15); // 20 - 5 = 15 remaining
    });

    it("should return empty array when no open position", () => {
      const ledger = new PositionLedger();

      const closingTrade = createTradeEntry({
        type: "CLOSE",
        quantity: 10,
        price: 1.00,
      });

      const closedLots = ledger.closePosition(closingTrade);

      expect(closedLots).toHaveLength(0);
    });

    it("should prorate fees when closing partial lots", () => {
      const ledger = new PositionLedger();

      ledger.addOpeningTrade(createTradeEntry({ quantity: 10, fees: 1.00 }));

      const closingTrade = createTradeEntry({
        type: "CLOSE",
        quantity: 5,
        price: 1.00,
        fees: 0.50,
      });

      const closedLots = ledger.closePosition(closingTrade);

      // Opening fees prorated: 1.00 * (5/10) = 0.50
      // Closing fees prorated: 0.50 * (5/5) = 0.50
      // Total fees: 1.00
      expect(closedLots[0].fees).toBeCloseTo(1.00, 2);
    });
  });

  describe("getOpenQuantity", () => {
    it("should return total open quantity", () => {
      const ledger = new PositionLedger();

      ledger.addOpeningTrade(createTradeEntry({ quantity: 10 }));
      ledger.addOpeningTrade(createTradeEntry({ quantity: 15 }));

      expect(ledger.getOpenQuantity("KXTEST-24SEP04", "YES")).toBe(25);
    });

    it("should return 0 for non-existent position", () => {
      const ledger = new PositionLedger();

      expect(ledger.getOpenQuantity("NONEXISTENT", "YES")).toBe(0);
    });
  });

  describe("clear", () => {
    it("should clear all positions", () => {
      const ledger = new PositionLedger();

      ledger.addOpeningTrade(createTradeEntry({ quantity: 10 }));
      ledger.clear();

      expect(ledger.getOpenQuantity("KXTEST-24SEP04", "YES")).toBe(0);
    });
  });
});

// ============================================================================
// FIFO CALCULATION TESTS
// ============================================================================

describe("calculateFifo", () => {
  it("should return empty result for empty trades array", () => {
    const result = calculateFifo([]);

    expect(result.closedLots).toHaveLength(0);
    expect(result.openLots).toHaveLength(0);
    expect(result.totalGrossPnl).toBe(0);
    expect(result.totalNetPnl).toBe(0);
  });

  it("should calculate P&L for simple open/close cycle", () => {
    const trades: TradeEntry[] = [
      createTradeEntry({ date: "2024-09-01", type: "OPEN", quantity: 10, price: 0.65 }),
      createTradeEntry({ date: "2024-09-04", type: "SETTLE", quantity: 10, settlementPrice: 1.00 }),
    ];

    const result = calculateFifo(trades);

    expect(result.closedLots).toHaveLength(1);
    expect(result.totalGrossPnl).toBeCloseTo(3.50, 2); // 10 * (1.00 - 0.65)
    expect(result.totalQuantityClosed).toBe(10);
    expect(result.totalQuantityOpen).toBe(0);
  });

  it("should calculate P&L for losing position", () => {
    const trades: TradeEntry[] = [
      createTradeEntry({ date: "2024-09-01", type: "OPEN", quantity: 10, price: 0.65 }),
      createTradeEntry({ date: "2024-09-04", type: "SETTLE", quantity: 10, settlementPrice: 0 }),
    ];

    const result = calculateFifo(trades);

    expect(result.totalGrossPnl).toBeCloseTo(-6.50, 2); // 10 * (0 - 0.65)
  });

  it("should handle multiple opening trades before closing", () => {
    const trades: TradeEntry[] = [
      createTradeEntry({ date: "2024-09-01", type: "OPEN", quantity: 5, price: 0.60 }),
      createTradeEntry({ date: "2024-09-02", type: "OPEN", quantity: 5, price: 0.70 }),
      createTradeEntry({ date: "2024-09-04", type: "SETTLE", quantity: 10, settlementPrice: 1.00 }),
    ];

    const result = calculateFifo(trades);

    // First 5: 5 * (1.00 - 0.60) = 2.00
    // Second 5: 5 * (1.00 - 0.70) = 1.50
    // Total: 3.50
    expect(result.totalGrossPnl).toBeCloseTo(3.50, 2);
    expect(result.closedLots).toHaveLength(2);
  });

  it("should sort trades by date before processing", () => {
    // Trades given out of order
    const trades: TradeEntry[] = [
      createTradeEntry({ date: "2024-09-04", type: "SETTLE", quantity: 10, settlementPrice: 1.00 }),
      createTradeEntry({ date: "2024-09-01", type: "OPEN", quantity: 10, price: 0.65 }),
    ];

    const result = calculateFifo(trades);

    // Should still work because trades are sorted
    expect(result.closedLots).toHaveLength(1);
    expect(result.totalGrossPnl).toBeCloseTo(3.50, 2);
  });

  it("should track remaining open positions", () => {
    const trades: TradeEntry[] = [
      createTradeEntry({ date: "2024-09-01", type: "OPEN", quantity: 20, price: 0.65 }),
      createTradeEntry({ date: "2024-09-04", type: "CLOSE", quantity: 5, price: 0.80 }),
    ];

    const result = calculateFifo(trades);

    expect(result.totalQuantityClosed).toBe(5);
    expect(result.totalQuantityOpen).toBe(15);
    expect(result.openLots).toHaveLength(1);
    expect(result.openLots[0].quantity).toBe(15);
  });

  it("should include fees in net P&L calculation", () => {
    const trades: TradeEntry[] = [
      createTradeEntry({ date: "2024-09-01", type: "OPEN", quantity: 10, price: 0.65, fees: 0.10 }),
      createTradeEntry({ date: "2024-09-04", type: "SETTLE", quantity: 10, settlementPrice: 1.00, fees: 0.10 }),
    ];

    const result = calculateFifo(trades);

    // Gross P&L: 3.50
    // Total fees: 0.20
    // Net P&L: 3.30
    expect(result.totalGrossPnl).toBeCloseTo(3.50, 2);
    expect(result.totalFees).toBeCloseTo(0.20, 2);
    expect(result.totalNetPnl).toBeCloseTo(3.30, 2);
  });
});

// ============================================================================
// CALCULATE ALL POSITIONS TESTS
// ============================================================================

describe("calculateAllPositions", () => {
  it("should group trades by symbol and side", () => {
    const trades: TradeEntry[] = [
      createTradeEntry({ symbol: "SYMBOL1", side: "YES", type: "OPEN", quantity: 10, price: 0.50 }),
      createTradeEntry({ symbol: "SYMBOL1", side: "YES", type: "CLOSE", quantity: 10, price: 1.00 }),
      createTradeEntry({ symbol: "SYMBOL1", side: "NO", type: "OPEN", quantity: 5, price: 0.50 }),
      createTradeEntry({ symbol: "SYMBOL2", side: "YES", type: "OPEN", quantity: 8, price: 0.60 }),
    ];

    const results = calculateAllPositions(trades);

    expect(results.size).toBe(3); // SYMBOL1|YES, SYMBOL1|NO, SYMBOL2|YES
    expect(results.has("SYMBOL1|YES")).toBe(true);
    expect(results.has("SYMBOL1|NO")).toBe(true);
    expect(results.has("SYMBOL2|YES")).toBe(true);
  });

  it("should calculate P&L correctly for each position", () => {
    const trades: TradeEntry[] = [
      // Symbol 1: Win $5.00
      createTradeEntry({ symbol: "SYMBOL1", side: "YES", type: "OPEN", quantity: 10, price: 0.50 }),
      createTradeEntry({ symbol: "SYMBOL1", side: "YES", type: "SETTLE", quantity: 10, settlementPrice: 1.00 }),
      // Symbol 2: Lose $3.00
      createTradeEntry({ symbol: "SYMBOL2", side: "YES", type: "OPEN", quantity: 10, price: 0.30 }),
      createTradeEntry({ symbol: "SYMBOL2", side: "YES", type: "SETTLE", quantity: 10, settlementPrice: 0 }),
    ];

    const results = calculateAllPositions(trades);

    const symbol1Result = results.get("SYMBOL1|YES");
    const symbol2Result = results.get("SYMBOL2|YES");

    expect(symbol1Result?.totalGrossPnl).toBeCloseTo(5.00, 2);
    expect(symbol2Result?.totalGrossPnl).toBeCloseTo(-3.00, 2);
  });
});

// ============================================================================
// AGGREGATION TESTS
// ============================================================================

describe("aggregateBySymbol", () => {
  it("should combine YES and NO sides for same symbol", () => {
    const results = new Map<string, ReturnType<typeof calculateFifo>>();

    results.set("SYMBOL1|YES", {
      symbol: "SYMBOL1",
      side: "YES",
      closedLots: [],
      openLots: [],
      totalGrossPnl: 5.00,
      totalFees: 0.10,
      totalNetPnl: 4.90,
      totalQuantityClosed: 10,
      totalQuantityOpen: 0,
    });

    results.set("SYMBOL1|NO", {
      symbol: "SYMBOL1",
      side: "NO",
      closedLots: [],
      openLots: [],
      totalGrossPnl: -2.00,
      totalFees: 0.05,
      totalNetPnl: -2.05,
      totalQuantityClosed: 5,
      totalQuantityOpen: 0,
    });

    const aggregated = aggregateBySymbol(results);

    expect(aggregated.size).toBe(1);
    const symbol1 = aggregated.get("SYMBOL1");
    expect(symbol1?.totalGrossPnl).toBeCloseTo(3.00, 2);
    expect(symbol1?.totalNetPnl).toBeCloseTo(2.85, 2);
    expect(symbol1?.yesPnl).toBeCloseTo(4.90, 2);
    expect(symbol1?.noPnl).toBeCloseTo(-2.05, 2);
  });
});

describe("getTotalPnl", () => {
  it("should sum P&L across all positions", () => {
    const results = new Map<string, ReturnType<typeof calculateFifo>>();

    results.set("SYMBOL1|YES", {
      symbol: "SYMBOL1",
      side: "YES",
      closedLots: [],
      openLots: [],
      totalGrossPnl: 10.00,
      totalFees: 0.50,
      totalNetPnl: 9.50,
      totalQuantityClosed: 10,
      totalQuantityOpen: 0,
    });

    results.set("SYMBOL2|YES", {
      symbol: "SYMBOL2",
      side: "YES",
      closedLots: [],
      openLots: [],
      totalGrossPnl: -5.00,
      totalFees: 0.25,
      totalNetPnl: -5.25,
      totalQuantityClosed: 5,
      totalQuantityOpen: 0,
    });

    const totals = getTotalPnl(results);

    expect(totals.grossPnl).toBeCloseTo(5.00, 2);
    expect(totals.fees).toBeCloseTo(0.75, 2);
    expect(totals.netPnl).toBeCloseTo(4.25, 2);
  });
});

describe("getWinLossStats", () => {
  it("should count winning and losing positions", () => {
    const results = new Map<string, ReturnType<typeof calculateFifo>>();

    results.set("SYMBOL1|YES", {
      symbol: "SYMBOL1",
      side: "YES",
      closedLots: [
        {
          symbol: "SYMBOL1",
          side: "YES",
          entryDate: "2024-09-01",
          exitDate: "2024-09-04",
          entryPrice: 0.50,
          exitPrice: 1.00,
          quantity: 10,
          grossPnl: 5.00,
          fees: 0.10,
          netPnl: 4.90, // Winner
        },
        {
          symbol: "SYMBOL1",
          side: "YES",
          entryDate: "2024-09-02",
          exitDate: "2024-09-05",
          entryPrice: 0.60,
          exitPrice: 0,
          quantity: 10,
          grossPnl: -6.00,
          fees: 0.10,
          netPnl: -6.10, // Loser
        },
      ],
      openLots: [],
      totalGrossPnl: -1.00,
      totalFees: 0.20,
      totalNetPnl: -1.20,
      totalQuantityClosed: 20,
      totalQuantityOpen: 0,
    });

    const stats = getWinLossStats(results);

    expect(stats.winningPositions).toBe(1);
    expect(stats.losingPositions).toBe(1);
    expect(stats.winRate).toBeCloseTo(0.50, 2);
    expect(stats.totalProfit).toBeCloseTo(4.90, 2);
    expect(stats.totalLoss).toBeCloseTo(6.10, 2);
  });

  it("should handle break-even positions", () => {
    const results = new Map<string, ReturnType<typeof calculateFifo>>();

    results.set("SYMBOL1|YES", {
      symbol: "SYMBOL1",
      side: "YES",
      closedLots: [
        {
          symbol: "SYMBOL1",
          side: "YES",
          entryDate: "2024-09-01",
          exitDate: "2024-09-04",
          entryPrice: 0.50,
          exitPrice: 0.50,
          quantity: 10,
          grossPnl: 0,
          fees: 0,
          netPnl: 0, // Break-even
        },
      ],
      openLots: [],
      totalGrossPnl: 0,
      totalFees: 0,
      totalNetPnl: 0,
      totalQuantityClosed: 10,
      totalQuantityOpen: 0,
    });

    const stats = getWinLossStats(results);

    expect(stats.breakEvenPositions).toBe(1);
    expect(stats.winningPositions).toBe(0);
    expect(stats.losingPositions).toBe(0);
  });

  it("should return 0 win rate when no closed positions", () => {
    const results = new Map<string, ReturnType<typeof calculateFifo>>();

    const stats = getWinLossStats(results);

    expect(stats.winRate).toBe(0);
  });
});
