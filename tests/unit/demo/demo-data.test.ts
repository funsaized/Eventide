/**
 * Demo Data Tests
 *
 * Validates the curated demo trades produce realistic and coherent data.
 */

import { describe, it, expect } from "vitest";
import {
  DEMO_IMPORT_IDS,
  DEMO_MONTHS,
  DEMO_TRADES,
  DEMO_IMPORT_ID,
  DEMO_ACCOUNT_NUMBER,
  calculateTradePnl,
  generatePairedTrades,
  getDemoSummary,
} from "@/lib/demo/demo-data";

describe("Demo Data", () => {
  describe("trade count", () => {
    it("should have approximately 60-70 trades", () => {
      expect(DEMO_TRADES.length).toBeGreaterThanOrEqual(60);
      expect(DEMO_TRADES.length).toBeLessThanOrEqual(75);
    });
  });

  describe("constants", () => {
    it("should have a backwards-compatible demo import ID alias", () => {
      expect(DEMO_IMPORT_ID).toBe("demo-import-aug");
    });

    it("should have a demo account number", () => {
      expect(DEMO_ACCOUNT_NUMBER).toBe("DEMO-000000");
    });

    it("should define 4 demo months from Aug-Nov 2024", () => {
      expect(DEMO_MONTHS).toHaveLength(4);
      expect(DEMO_MONTHS[0]?.importId).toBe("demo-import-aug");
      expect(DEMO_MONTHS[1]?.importId).toBe("demo-import-sep");
      expect(DEMO_MONTHS[2]?.importId).toBe("demo-import-oct");
      expect(DEMO_MONTHS[3]?.importId).toBe("demo-import-nov");
      expect(DEMO_MONTHS[0]?.periodStart).toBe("2024-08-01");
      expect(DEMO_MONTHS[3]?.periodEnd).toBe("2024-11-30");
    });

    it("should expose demo import IDs for all months", () => {
      expect(DEMO_IMPORT_IDS).toEqual([
        "demo-import-aug",
        "demo-import-sep",
        "demo-import-oct",
        "demo-import-nov",
      ]);
    });
  });

  describe("trade validity", () => {
    it("all trades should have valid prices between 0 and 1", () => {
      for (const trade of DEMO_TRADES) {
        expect(trade.price).toBeGreaterThanOrEqual(0);
        expect(trade.price).toBeLessThanOrEqual(1);
      }
    });

    it("all trades should have positive quantities", () => {
      for (const trade of DEMO_TRADES) {
        expect(trade.quantity).toBeGreaterThan(0);
      }
    });

    it("all settlement prices should be 0 or 1", () => {
      for (const trade of DEMO_TRADES) {
        if (trade.settlementPrice !== null) {
          expect([0, 1]).toContain(trade.settlementPrice);
        }
      }
    });

    it("all trades should have non-negative fees", () => {
      for (const trade of DEMO_TRADES) {
        expect(trade.fees).toBeGreaterThanOrEqual(0);
      }
    });

    it("all trades should have a valid side", () => {
      for (const trade of DEMO_TRADES) {
        expect(["YES", "NO"]).toContain(trade.side);
      }
    });
  });

  describe("category coverage", () => {
    it("should cover NFL, Economics, Tennis, Politics, Weather categories", () => {
      const categories = new Set(DEMO_TRADES.map((t) => t.category));
      expect(categories.has("NFL")).toBe(true);
      expect(categories.has("Economics")).toBe(true);
      expect(categories.has("Tennis")).toBe(true);
      expect(categories.has("Politics")).toBe(true);
      expect(categories.has("Weather")).toBe(true);
    });

    it("should cover NCAAF category", () => {
      const categories = new Set(DEMO_TRADES.map((t) => t.category));
      expect(categories.has("NCAAF")).toBe(true);
    });
  });

  describe("monthly structure", () => {
    it("trades should span 4 months (Aug-Nov 2024)", () => {
      const months = new Set(DEMO_TRADES.map((t) => t.date.slice(0, 7)));
      expect(months).toEqual(new Set(["2024-08", "2024-09", "2024-10", "2024-11"]));
    });

    it("each month should have at least 10 trades", () => {
      const tradeCounts = DEMO_TRADES.reduce<Record<string, number>>((counts, trade) => {
        counts[trade.importId] = (counts[trade.importId] ?? 0) + 1;
        return counts;
      }, {});

      for (const month of DEMO_MONTHS) {
        expect(tradeCounts[month.importId] ?? 0).toBeGreaterThanOrEqual(10);
      }
    });
  });

  describe("P&L calculation", () => {
    it("should calculate YES wins correctly", () => {
      // YES side, settled at 1.00: (1.00 - price) * qty
      const pnl = calculateTradePnl({
        importId: "demo-import-aug",
        date: "2024-01-01",
        symbol: "TEST",
        side: "YES",
        quantity: 100,
        price: 0.65,
        fees: 0,
        category: "NFL",
        settlementDate: "2024-01-02",
        settlementPrice: 1.00,
      });
      expect(pnl).toBeCloseTo(35.00);
    });

    it("should calculate YES losses correctly", () => {
      // YES side, settled at 0.00: (0.00 - price) * qty
      const pnl = calculateTradePnl({
        importId: "demo-import-aug",
        date: "2024-01-01",
        symbol: "TEST",
        side: "YES",
        quantity: 100,
        price: 0.65,
        fees: 0,
        category: "NFL",
        settlementDate: "2024-01-02",
        settlementPrice: 0.00,
      });
      expect(pnl).toBeCloseTo(-65.00);
    });

    it("should calculate NO wins correctly", () => {
      // NO side, settled at 0.00: ((1 - 0.00) - price) * qty = (1 - price) * qty
      const pnl = calculateTradePnl({
        importId: "demo-import-aug",
        date: "2024-01-01",
        symbol: "TEST",
        side: "NO",
        quantity: 60,
        price: 0.35,
        fees: 0,
        category: "NFL",
        settlementDate: "2024-01-02",
        settlementPrice: 0.00,
      });
      expect(pnl).toBeCloseTo(39.00);
    });

    it("should return null for unsettled trades", () => {
      const pnl = calculateTradePnl({
        importId: "demo-import-aug",
        date: "2024-01-01",
        symbol: "TEST",
        side: "YES",
        quantity: 100,
        price: 0.50,
        fees: 0,
        category: "NFL",
        settlementDate: null,
        settlementPrice: null,
      });
      expect(pnl).toBeNull();
    });
  });

  describe("narrative scenarios", () => {
    it("NFL should be net profitable", () => {
      const nflTrades = DEMO_TRADES.filter((t) => t.category === "NFL");
      const nflPnl = nflTrades.reduce((sum, t) => {
        const pnl = calculateTradePnl(t);
        return sum + (pnl ?? 0);
      }, 0);
      expect(nflPnl).toBeGreaterThan(100);
    });

    it("Economics should be net negative", () => {
      const econTrades = DEMO_TRADES.filter((t) => t.category === "Economics");
      const econPnl = econTrades.reduce((sum, t) => {
        const pnl = calculateTradePnl(t);
        return sum + (pnl ?? 0);
      }, 0);
      expect(econPnl).toBeLessThan(0);
    });

    it("Politics should have a large win", () => {
      const politicsTrades = DEMO_TRADES.filter((t) => t.category === "Politics");
      const politicsPnl = politicsTrades.reduce((sum, t) => {
        const pnl = calculateTradePnl(t);
        return sum + (pnl ?? 0);
      }, 0);
      expect(politicsPnl).toBeGreaterThan(200);
    });

    it("Weather should show fee drag (small P&L relative to fees)", () => {
      const weatherTrades = DEMO_TRADES.filter((t) => t.category === "Weather");
      const weatherPnl = weatherTrades.reduce((sum, t) => {
        const pnl = calculateTradePnl(t);
        return sum + (pnl ?? 0);
      }, 0);
      const weatherFees = weatherTrades.reduce((sum, t) => sum + t.fees, 0);
      // Fees should be a significant portion of gross P&L
      expect(weatherFees).toBeGreaterThan(Math.abs(weatherPnl) * 0.3);
    });
  });

  describe("generatePairedTrades", () => {
    it("should produce 2 trades per settled position", () => {
      const paired = generatePairedTrades();
      const settledPositions = DEMO_TRADES.filter((t) => t.settlementDate !== null);
      expect(paired.length).toBe(settledPositions.length * 2);
    });

    it("each symbol should have both YES and NO sides", () => {
      const paired = generatePairedTrades();
      const symbolSides = new Map<string, Set<string>>();
      for (const trade of paired) {
        const sides = symbolSides.get(trade.symbol) ?? new Set();
        sides.add(trade.side);
        symbolSides.set(trade.symbol, sides);
      }
      for (const [, sides] of symbolSides) {
        expect(sides.size).toBe(2);
      }
    });

    it("opening legs should have no settlement", () => {
      const paired = generatePairedTrades();
      const openLegs = paired.filter((t) => t.settlementDate === null);
      expect(openLegs.length).toBeGreaterThan(0);
      for (const leg of openLegs) {
        expect(leg.settlementPrice).toBeNull();
      }
    });

    it("settlement legs should have opposite side from the position", () => {
      const paired = generatePairedTrades();
      for (const position of DEMO_TRADES) {
        if (!position.settlementDate) continue;
        const oppositeSide = position.side === "YES" ? "NO" : "YES";
        const settlementLeg = paired.find(
          (t) => t.symbol === position.symbol && t.side === oppositeSide && t.settlementDate !== null
        );
        expect(settlementLeg).toBeDefined();
      }
    });
  });

  describe("getDemoSummary", () => {
    it("should return coherent summary", () => {
      const summary = getDemoSummary();

      expect(summary.tradeCount).toBe(DEMO_TRADES.length);
      expect(summary.totalFees).toBeGreaterThan(0);
      expect(summary.wins).toBeGreaterThan(0);
      expect(summary.losses).toBeGreaterThan(0);
      expect(summary.wins + summary.losses).toBe(summary.tradeCount);
      expect(summary.totalGrossPnl - summary.totalFees).toBeCloseTo(summary.netPnl);
      expect(summary.winRate).toBeGreaterThan(0);
      expect(summary.winRate).toBeLessThan(1);
    });

    it("overall net P&L should be positive (good demo narrative)", () => {
      const summary = getDemoSummary();
      expect(summary.netPnl).toBeGreaterThan(0);
    });
  });
});
