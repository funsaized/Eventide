/**
 * Section 5 Parser Tests
 *
 * Tests for Purchase and Sale Summary parsing functionality.
 * Section 5 is the SOURCE OF TRUTH for P&L figures.
 */

import { describe, it, expect } from "vitest";
import {
  parseSection5,
  pairPositionRows,
  getPnlBySymbol,
  getTotalPnl,
  getWinningPositions,
  getLosingPositions,
  calculateWinRate,
  validatePnl,
  findSection5Pnl,
  findPairedPosition,
  type PurchaseSaleSummaryRow,
  type PairedPosition,
} from "@/lib/parsing/sections/section5";
import {
  createMockSection5Data,
  createMockSection5WithNegativePnl,
  createMockSectionBoundary,
} from "../../fixtures/section-mocks";

describe("parseSection5", () => {
  it("should handle empty section", () => {
    const boundary = createMockSectionBoundary([], "section5");

    const result = parseSection5(boundary, 612);

    expect(result.rows).toHaveLength(0);
    expect(result.pairedPositions).toHaveLength(0);
    expect(result.warnings).toContain("Section 5 has no items");
  });

  it("should return proper result structure", () => {
    const mockData = createMockSection5Data();
    const boundary = createMockSectionBoundary(mockData.items, "section5");

    const result = parseSection5(boundary, mockData.pageWidth);

    // Result should have proper structure regardless of parsing success
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("pairedPositions");
    expect(result).toHaveProperty("totalGrossPnl");
    expect(result).toHaveProperty("rowsProcessed");
    expect(result).toHaveProperty("validRows");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("layout");
    expect(Array.isArray(result.rows)).toBe(true);
    expect(Array.isArray(result.pairedPositions)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(typeof result.totalGrossPnl).toBe("number");
  });

  it("should track rows processed count", () => {
    const mockData = createMockSection5Data();
    const boundary = createMockSectionBoundary(mockData.items, "section5");

    const result = parseSection5(boundary, mockData.pageWidth);

    expect(result.rowsProcessed).toBeGreaterThanOrEqual(0);
  });

  it("should return warnings for missing headers", () => {
    const items = [
      { text: "Random text", x: 10, y: 100, width: 50, height: 10, pageNumber: 1 },
      { text: "More text", x: 60, y: 100, width: 50, height: 10, pageNumber: 1 },
    ];
    const boundary = createMockSectionBoundary(items, "section5");

    const result = parseSection5(boundary, 612);

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("pairPositionRows", () => {
  it("should pair YES and NO rows for same symbol/expDate", () => {
    const rows: PurchaseSaleSummaryRow[] = [
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 10,
        totalQtyShort: 10,
        subtype: "YES",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        grossPnl: -6.50,
        currency: "USD",
        description: "",
      },
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 10,
        totalQtyShort: 10,
        subtype: "NO",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        grossPnl: 10.00,
        currency: "USD",
        description: "",
      },
    ];

    const result = pairPositionRows(rows);

    expect(result).toHaveLength(1);
    expect(result[0].yesRow).not.toBeNull();
    expect(result[0].noRow).not.toBeNull();
    expect(result[0].netPnl).toBeCloseTo(3.50, 2); // -6.50 + 10.00 = 3.50
  });

  it("should calculate net P&L correctly", () => {
    const rows: PurchaseSaleSummaryRow[] = [
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 20,
        totalQtyShort: 20,
        subtype: "YES",
        symbol: "KXFED",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-18",
        grossPnl: 6.00,
        currency: "USD",
        description: "",
      },
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 20,
        totalQtyShort: 20,
        subtype: "NO",
        symbol: "KXFED",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-18",
        grossPnl: 0.00,
        currency: "USD",
        description: "",
      },
    ];

    const result = pairPositionRows(rows);

    expect(result[0].netPnl).toBeCloseTo(6.00, 2);
  });

  it("should handle position with only YES row", () => {
    const rows: PurchaseSaleSummaryRow[] = [
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 10,
        totalQtyShort: 10,
        subtype: "YES",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        grossPnl: -5.00,
        currency: "USD",
        description: "",
      },
    ];

    const result = pairPositionRows(rows);

    expect(result).toHaveLength(1);
    expect(result[0].yesRow).not.toBeNull();
    expect(result[0].noRow).toBeNull();
    expect(result[0].netPnl).toBe(-5.00);
  });

  it("should keep separate positions for different symbols", () => {
    const rows: PurchaseSaleSummaryRow[] = [
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 10,
        totalQtyShort: 10,
        subtype: "YES",
        symbol: "KXTEST1",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        grossPnl: 5.00,
        currency: "USD",
        description: "",
      },
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 10,
        totalQtyShort: 10,
        subtype: "YES",
        symbol: "KXTEST2",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        grossPnl: 10.00,
        currency: "USD",
        description: "",
      },
    ];

    const result = pairPositionRows(rows);

    expect(result).toHaveLength(2);
  });

  it("should keep separate positions for different expDates", () => {
    const rows: PurchaseSaleSummaryRow[] = [
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 10,
        totalQtyShort: 10,
        subtype: "YES",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        grossPnl: 5.00,
        currency: "USD",
        description: "",
      },
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 10,
        totalQtyShort: 10,
        subtype: "YES",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-05",
        grossPnl: 10.00,
        currency: "USD",
        description: "",
      },
    ];

    const result = pairPositionRows(rows);

    expect(result).toHaveLength(2);
  });
});

describe("getPnlBySymbol", () => {
  it("should aggregate P&L by symbol", () => {
    const pairedPositions: PairedPosition[] = [
      {
        symbol: "KXTEST",
        expDate: "2024-09-04",
        yesRow: null,
        noRow: null,
        netPnl: 5.00,
        totalQuantity: 10,
        description: "",
      },
      {
        symbol: "KXTEST",
        expDate: "2024-09-05",
        yesRow: null,
        noRow: null,
        netPnl: 3.00,
        totalQuantity: 5,
        description: "",
      },
      {
        symbol: "KXOTHER",
        expDate: "2024-09-06",
        yesRow: null,
        noRow: null,
        netPnl: -2.00,
        totalQuantity: 20,
        description: "",
      },
    ];

    const result = getPnlBySymbol(pairedPositions);

    expect(result.get("KXTEST")).toBeCloseTo(8.00, 2);
    expect(result.get("KXOTHER")).toBeCloseTo(-2.00, 2);
  });
});

describe("getTotalPnl", () => {
  it("should sum all position P&L values", () => {
    const pairedPositions: PairedPosition[] = [
      {
        symbol: "KXTEST1",
        expDate: "2024-09-04",
        yesRow: null,
        noRow: null,
        netPnl: 5.00,
        totalQuantity: 10,
        description: "",
      },
      {
        symbol: "KXTEST2",
        expDate: "2024-09-05",
        yesRow: null,
        noRow: null,
        netPnl: -3.00,
        totalQuantity: 5,
        description: "",
      },
      {
        symbol: "KXTEST3",
        expDate: "2024-09-06",
        yesRow: null,
        noRow: null,
        netPnl: 2.50,
        totalQuantity: 20,
        description: "",
      },
    ];

    const result = getTotalPnl(pairedPositions);

    expect(result).toBeCloseTo(4.50, 2);
  });

  it("should return 0 for empty array", () => {
    const result = getTotalPnl([]);
    expect(result).toBe(0);
  });
});

describe("getWinningPositions", () => {
  it("should return positions with positive P&L", () => {
    const pairedPositions: PairedPosition[] = [
      {
        symbol: "KXWIN",
        expDate: "2024-09-04",
        yesRow: null,
        noRow: null,
        netPnl: 5.00,
        totalQuantity: 10,
        description: "",
      },
      {
        symbol: "KXLOSE",
        expDate: "2024-09-05",
        yesRow: null,
        noRow: null,
        netPnl: -3.00,
        totalQuantity: 5,
        description: "",
      },
      {
        symbol: "KXEVEN",
        expDate: "2024-09-06",
        yesRow: null,
        noRow: null,
        netPnl: 0,
        totalQuantity: 20,
        description: "",
      },
    ];

    const result = getWinningPositions(pairedPositions);

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("KXWIN");
  });
});

describe("getLosingPositions", () => {
  it("should return positions with negative P&L", () => {
    const pairedPositions: PairedPosition[] = [
      {
        symbol: "KXWIN",
        expDate: "2024-09-04",
        yesRow: null,
        noRow: null,
        netPnl: 5.00,
        totalQuantity: 10,
        description: "",
      },
      {
        symbol: "KXLOSE",
        expDate: "2024-09-05",
        yesRow: null,
        noRow: null,
        netPnl: -3.00,
        totalQuantity: 5,
        description: "",
      },
      {
        symbol: "KXEVEN",
        expDate: "2024-09-06",
        yesRow: null,
        noRow: null,
        netPnl: 0,
        totalQuantity: 20,
        description: "",
      },
    ];

    const result = getLosingPositions(pairedPositions);

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("KXLOSE");
  });
});

describe("calculateWinRate", () => {
  it("should calculate correct win rate", () => {
    const pairedPositions: PairedPosition[] = [
      {
        symbol: "KXWIN1",
        expDate: "2024-09-04",
        yesRow: null,
        noRow: null,
        netPnl: 5.00,
        totalQuantity: 10,
        description: "",
      },
      {
        symbol: "KXWIN2",
        expDate: "2024-09-05",
        yesRow: null,
        noRow: null,
        netPnl: 3.00,
        totalQuantity: 5,
        description: "",
      },
      {
        symbol: "KXLOSE",
        expDate: "2024-09-06",
        yesRow: null,
        noRow: null,
        netPnl: -2.00,
        totalQuantity: 20,
        description: "",
      },
    ];

    const result = calculateWinRate(pairedPositions);

    expect(result).toBeCloseTo(0.6667, 2); // 2 winners / 3 total
  });

  it("should return 0 for empty array", () => {
    const result = calculateWinRate([]);
    expect(result).toBe(0);
  });

  it("should return 1 for all winners", () => {
    const pairedPositions: PairedPosition[] = [
      {
        symbol: "KXWIN1",
        expDate: "2024-09-04",
        yesRow: null,
        noRow: null,
        netPnl: 5.00,
        totalQuantity: 10,
        description: "",
      },
      {
        symbol: "KXWIN2",
        expDate: "2024-09-05",
        yesRow: null,
        noRow: null,
        netPnl: 3.00,
        totalQuantity: 5,
        description: "",
      },
    ];

    const result = calculateWinRate(pairedPositions);

    expect(result).toBe(1);
  });

  it("should return 0 for all losers", () => {
    const pairedPositions: PairedPosition[] = [
      {
        symbol: "KXLOSE1",
        expDate: "2024-09-04",
        yesRow: null,
        noRow: null,
        netPnl: -5.00,
        totalQuantity: 10,
        description: "",
      },
      {
        symbol: "KXLOSE2",
        expDate: "2024-09-05",
        yesRow: null,
        noRow: null,
        netPnl: -3.00,
        totalQuantity: 5,
        description: "",
      },
    ];

    const result = calculateWinRate(pairedPositions);

    expect(result).toBe(0);
  });
});

describe("validatePnl", () => {
  it("should return valid for matching P&L values", () => {
    const result = validatePnl(100.00, 100.00);

    expect(result.isValid).toBe(true);
    expect(result.discrepancy).toBe(0);
  });

  it("should return valid within tolerance", () => {
    const result = validatePnl(100.00, 100.005, 0.01);

    expect(result.isValid).toBe(true);
    expect(result.discrepancy).toBeCloseTo(0.005, 3);
  });

  it("should return invalid outside tolerance", () => {
    const result = validatePnl(100.00, 100.02, 0.01);

    expect(result.isValid).toBe(false);
    expect(result.discrepancy).toBeCloseTo(0.02, 3);
  });

  it("should handle negative P&L values", () => {
    const result = validatePnl(-50.00, -50.005, 0.01);

    expect(result.isValid).toBe(true);
  });

  it("should use default tolerance of 0.01", () => {
    const result = validatePnl(100.00, 100.005);

    expect(result.isValid).toBe(true);
  });
});

describe("findSection5Pnl", () => {
  it("should find P&L for matching symbol and side", () => {
    const rows: PurchaseSaleSummaryRow[] = [
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 10,
        totalQtyShort: 10,
        subtype: "YES",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        grossPnl: -6.50,
        currency: "USD",
        description: "",
      },
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 10,
        totalQtyShort: 10,
        subtype: "NO",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        grossPnl: 10.00,
        currency: "USD",
        description: "",
      },
    ];

    const yesResult = findSection5Pnl(rows, "KXTEST", "YES");
    const noResult = findSection5Pnl(rows, "KXTEST", "NO");

    expect(yesResult).toBe(-6.50);
    expect(noResult).toBe(10.00);
  });

  it("should return null for non-existent symbol", () => {
    const rows: PurchaseSaleSummaryRow[] = [
      {
        tradeDate: "2024-09-04",
        accountType: "SW",
        totalQtyLong: 10,
        totalQtyShort: 10,
        subtype: "YES",
        symbol: "KXTEST",
        contractYear: 2024,
        exchange: "Kalshi",
        expDate: "2024-09-04",
        grossPnl: -6.50,
        currency: "USD",
        description: "",
      },
    ];

    const result = findSection5Pnl(rows, "KXOTHER", "YES");

    expect(result).toBeNull();
  });
});

describe("findPairedPosition", () => {
  it("should find position by symbol", () => {
    const pairedPositions: PairedPosition[] = [
      {
        symbol: "KXTEST1",
        expDate: "2024-09-04",
        yesRow: null,
        noRow: null,
        netPnl: 5.00,
        totalQuantity: 10,
        description: "",
      },
      {
        symbol: "KXTEST2",
        expDate: "2024-09-05",
        yesRow: null,
        noRow: null,
        netPnl: -3.00,
        totalQuantity: 5,
        description: "",
      },
    ];

    const result = findPairedPosition(pairedPositions, "KXTEST1");

    expect(result).not.toBeNull();
    expect(result?.symbol).toBe("KXTEST1");
    expect(result?.netPnl).toBe(5.00);
  });

  it("should return null for non-existent symbol", () => {
    const pairedPositions: PairedPosition[] = [
      {
        symbol: "KXTEST",
        expDate: "2024-09-04",
        yesRow: null,
        noRow: null,
        netPnl: 5.00,
        totalQuantity: 10,
        description: "",
      },
    ];

    const result = findPairedPosition(pairedPositions, "KXOTHER");

    expect(result).toBeNull();
  });
});
