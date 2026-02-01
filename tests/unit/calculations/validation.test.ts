/**
 * P&L Validation Tests
 *
 * Tests for validating calculated P&L against Section 5 figures.
 */

import { describe, it, expect } from "vitest";
import {
  PNL_TOLERANCE,
  validatePosition,
  validatePnlAgainstSection5,
  quickValidateTotals,
  analyzeDiscrepancy,
  generateDiscrepancyReport,
  createReconciliationRecord,
  shouldBlockImport,
  type PositionValidation,
} from "@/lib/calculations/validation";
import type { PairedPosition } from "@/lib/parsing/sections/section5";
import type { FifoResult } from "@/lib/calculations/fifo";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createPairedPosition(overrides: Partial<PairedPosition> = {}): PairedPosition {
  return {
    symbol: "KXTEST-24SEP04",
    expDate: "2024-09-04",
    yesRow: null,
    noRow: null,
    netPnl: 0,
    totalQuantity: 10,
    description: "",
    ...overrides,
  };
}

// ============================================================================
// VALIDATE POSITION TESTS
// ============================================================================

describe("validatePosition", () => {
  it("should return valid when discrepancy is within tolerance", () => {
    const result = validatePosition(
      "KXTEST-24SEP04",
      "2024-09-04",
      5.00,
      5.00
    );

    expect(result.isValid).toBe(true);
    expect(result.discrepancy).toBe(0);
  });

  it("should return valid when discrepancy equals tolerance", () => {
    const result = validatePosition(
      "KXTEST-24SEP04",
      "2024-09-04",
      5.00,
      5.00 + PNL_TOLERANCE // Exactly at tolerance
    );

    expect(result.isValid).toBe(true);
    expect(result.discrepancy).toBeCloseTo(PNL_TOLERANCE, 4);
  });

  it("should return invalid when discrepancy exceeds tolerance", () => {
    const result = validatePosition(
      "KXTEST-24SEP04",
      "2024-09-04",
      5.00,
      5.05 // $0.05 difference
    );

    expect(result.isValid).toBe(false);
    expect(result.discrepancy).toBeCloseTo(0.05, 4);
  });

  it("should calculate discrepancy percentage correctly", () => {
    const result = validatePosition(
      "KXTEST-24SEP04",
      "2024-09-04",
      90.00,
      100.00
    );

    // 10% discrepancy
    expect(result.discrepancyPercent).toBeCloseTo(10, 1);
  });

  it("should handle zero reported P&L", () => {
    const result = validatePosition(
      "KXTEST-24SEP04",
      "2024-09-04",
      0.05,
      0
    );

    // Can't calculate percentage when reported is 0
    expect(result.discrepancyPercent).toBeNull();
    expect(result.discrepancy).toBeCloseTo(0.05, 4);
  });

  it("should handle negative P&L values", () => {
    const result = validatePosition(
      "KXTEST-24SEP04",
      "2024-09-04",
      -10.00,
      -10.00
    );

    expect(result.isValid).toBe(true);
    expect(result.discrepancy).toBe(0);
  });
});

// ============================================================================
// VALIDATE P&L AGAINST SECTION 5 TESTS
// ============================================================================

describe("validatePnlAgainstSection5", () => {
  it("should validate all positions successfully when P&L matches", () => {
    const fifoResults = new Map<string, FifoResult>();
    fifoResults.set("SYMBOL1|YES", {
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

    const section5Positions: PairedPosition[] = [
      createPairedPosition({
        symbol: "SYMBOL1",
        expDate: "2024-09-04",
        netPnl: 5.00,
        totalQuantity: 10,
      }),
    ];

    const result = validatePnlAgainstSection5(fifoResults, section5Positions);

    expect(result.isValid).toBe(true);
    expect(result.passes).toHaveLength(1);
    expect(result.failures).toHaveLength(0);
  });

  it("should detect P&L discrepancies", () => {
    const fifoResults = new Map<string, FifoResult>();
    fifoResults.set("SYMBOL1|YES", {
      symbol: "SYMBOL1",
      side: "YES",
      closedLots: [],
      openLots: [],
      totalGrossPnl: 4.00, // Different from Section 5
      totalFees: 0.10,
      totalNetPnl: 3.90,
      totalQuantityClosed: 10,
      totalQuantityOpen: 0,
    });

    const section5Positions: PairedPosition[] = [
      createPairedPosition({
        symbol: "SYMBOL1",
        expDate: "2024-09-04",
        netPnl: 5.00, // $1.00 discrepancy
        totalQuantity: 10,
      }),
    ];

    const result = validatePnlAgainstSection5(fifoResults, section5Positions);

    expect(result.isValid).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].discrepancy).toBeCloseTo(1.00, 2);
  });

  it("should combine YES and NO sides for same symbol", () => {
    const fifoResults = new Map<string, FifoResult>();
    fifoResults.set("SYMBOL1|YES", {
      symbol: "SYMBOL1",
      side: "YES",
      closedLots: [],
      openLots: [],
      totalGrossPnl: 3.00,
      totalFees: 0.05,
      totalNetPnl: 2.95,
      totalQuantityClosed: 10,
      totalQuantityOpen: 0,
    });
    fifoResults.set("SYMBOL1|NO", {
      symbol: "SYMBOL1",
      side: "NO",
      closedLots: [],
      openLots: [],
      totalGrossPnl: 2.00,
      totalFees: 0.05,
      totalNetPnl: 1.95,
      totalQuantityClosed: 10,
      totalQuantityOpen: 0,
    });

    const section5Positions: PairedPosition[] = [
      createPairedPosition({
        symbol: "SYMBOL1",
        expDate: "2024-09-04",
        netPnl: 5.00, // Combined YES + NO
        totalQuantity: 20,
      }),
    ];

    const result = validatePnlAgainstSection5(fifoResults, section5Positions);

    expect(result.isValid).toBe(true);
    expect(result.totalCalculatedPnl).toBeCloseTo(5.00, 2);
  });

  it("should flag FIFO results without matching Section 5 entries", () => {
    const fifoResults = new Map<string, FifoResult>();
    fifoResults.set("UNMATCHED|YES", {
      symbol: "UNMATCHED",
      side: "YES",
      closedLots: [],
      openLots: [],
      totalGrossPnl: 5.00,
      totalFees: 0.10,
      totalNetPnl: 4.90,
      totalQuantityClosed: 10,
      totalQuantityOpen: 0,
    });

    const section5Positions: PairedPosition[] = []; // No matching Section 5

    const result = validatePnlAgainstSection5(fifoResults, section5Positions);

    expect(result.isValid).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].symbol).toBe("UNMATCHED");
    expect(result.failures[0].reportedPnl).toBe(0);
  });

  it("should generate accurate summary message", () => {
    const fifoResults = new Map<string, FifoResult>();
    fifoResults.set("SYMBOL1|YES", {
      symbol: "SYMBOL1",
      side: "YES",
      closedLots: [],
      openLots: [],
      totalGrossPnl: 5.00,
      totalFees: 0,
      totalNetPnl: 5.00,
      totalQuantityClosed: 10,
      totalQuantityOpen: 0,
    });

    const section5Positions: PairedPosition[] = [
      createPairedPosition({
        symbol: "SYMBOL1",
        expDate: "2024-09-04",
        netPnl: 5.00,
        totalQuantity: 10,
      }),
    ];

    const result = validatePnlAgainstSection5(fifoResults, section5Positions);

    expect(result.summary).toContain("1 positions validated successfully");
    expect(result.summary).toContain("$5.00");
  });
});

// ============================================================================
// QUICK VALIDATE TOTALS TESTS
// ============================================================================

describe("quickValidateTotals", () => {
  it("should pass when totals match exactly", () => {
    const result = quickValidateTotals(100.00, 100.00);

    expect(result.isValid).toBe(true);
    expect(result.discrepancy).toBe(0);
    expect(result.message).toContain("match within tolerance");
  });

  it("should pass when within default tolerance ($1)", () => {
    const result = quickValidateTotals(100.50, 100.00);

    expect(result.isValid).toBe(true);
    expect(result.discrepancy).toBeCloseTo(0.50, 2);
  });

  it("should fail when exceeding default tolerance", () => {
    const result = quickValidateTotals(102.00, 100.00);

    expect(result.isValid).toBe(false);
    expect(result.discrepancy).toBeCloseTo(2.00, 2);
    expect(result.message).toContain("mismatch");
  });

  it("should use custom tolerance when provided", () => {
    const result = quickValidateTotals(105.00, 100.00, 10.00);

    expect(result.isValid).toBe(true); // Within $10 tolerance
    expect(result.discrepancy).toBeCloseTo(5.00, 2);
  });
});

// ============================================================================
// DISCREPANCY ANALYSIS TESTS
// ============================================================================

describe("analyzeDiscrepancy", () => {
  it("should identify rounding discrepancies", () => {
    const validation: PositionValidation = {
      symbol: "KXTEST",
      expDate: "2024-09-04",
      calculatedPnl: 5.02,
      reportedPnl: 5.00,
      discrepancy: 0.02,
      isValid: false,
      discrepancyPercent: 0.4,
    };

    expect(analyzeDiscrepancy(validation)).toBe("ROUNDING");
  });

  it("should identify missing trade discrepancies", () => {
    const validation: PositionValidation = {
      symbol: "KXTEST",
      expDate: "2024-09-04",
      calculatedPnl: 0,
      reportedPnl: 10.00,
      discrepancy: 10.00,
      isValid: false,
      discrepancyPercent: 100,
    };

    expect(analyzeDiscrepancy(validation)).toBe("MISSING_TRADE");
  });

  it("should identify prior period discrepancies", () => {
    const validation: PositionValidation = {
      symbol: "KXTEST",
      expDate: "2024-09-04",
      calculatedPnl: 15.00, // More than reported
      reportedPnl: 10.00,
      discrepancy: 5.00,
      isValid: false,
      discrepancyPercent: 50,
    };

    expect(analyzeDiscrepancy(validation)).toBe("PRIOR_PERIOD");
  });

  it("should identify fee allocation discrepancies", () => {
    const validation: PositionValidation = {
      symbol: "KXTEST",
      expDate: "2024-09-04",
      calculatedPnl: 9.50,
      reportedPnl: 10.00,
      discrepancy: 0.50,
      isValid: false,
      discrepancyPercent: 4, // Less than 5%
    };

    expect(analyzeDiscrepancy(validation)).toBe("FEE_ALLOCATION");
  });

  it("should identify partial settlement discrepancies", () => {
    const validation: PositionValidation = {
      symbol: "KXTEST",
      expDate: "2024-09-04",
      calculatedPnl: 8.00,
      reportedPnl: 10.00,
      discrepancy: 2.73, // Non-round number > 0.10
      isValid: false,
      discrepancyPercent: 27.3,
    };

    expect(analyzeDiscrepancy(validation)).toBe("PARTIAL_SETTLEMENT");
  });

  it("should return UNKNOWN for unclassifiable discrepancies", () => {
    const validation: PositionValidation = {
      symbol: "KXTEST",
      expDate: "2024-09-04",
      calculatedPnl: 5.00,
      reportedPnl: 10.00,
      discrepancy: 5.00, // Round number, can't determine cause
      isValid: false,
      discrepancyPercent: 50,
    };

    expect(analyzeDiscrepancy(validation)).toBe("UNKNOWN");
  });
});

// ============================================================================
// DISCREPANCY REPORT TESTS
// ============================================================================

describe("generateDiscrepancyReport", () => {
  it("should generate success report when valid", () => {
    const result = {
      isValid: true,
      positions: [],
      failures: [],
      passes: [{ symbol: "KXTEST" } as PositionValidation],
      priorPeriodIssues: [],
      bothSidedIssues: [],
      totalCalculatedPnl: 10.00,
      totalReportedPnl: 10.00,
      totalDiscrepancy: 0,
      adjustedDiscrepancy: 0,
      summary: "All positions validated",
    };

    const report = generateDiscrepancyReport(result);

    expect(report).toContain("All positions validated successfully");
    expect(report).toContain("Total Calculated: $10.00");
    expect(report).toContain("Total Reported:   $10.00");
  });

  it("should generate failure report with causes", () => {
    const result = {
      isValid: false,
      positions: [],
      failures: [
        {
          symbol: "KXTEST",
          expDate: "2024-09-04",
          calculatedPnl: 0,
          reportedPnl: 10.00,
          discrepancy: 10.00,
          isValid: false,
          discrepancyPercent: 100,
        },
      ],
      passes: [],
      priorPeriodIssues: [],
      bothSidedIssues: [],
      totalCalculatedPnl: 0,
      totalReportedPnl: 10.00,
      totalDiscrepancy: 10.00,
      adjustedDiscrepancy: 10.00,
      summary: "Discrepancies found",
    };

    const report = generateDiscrepancyReport(result);

    expect(report).toContain("1 positions have discrepancies");
    expect(report).toContain("KXTEST");
    expect(report).toContain("Likely cause: MISSING_TRADE");
  });
});

// ============================================================================
// RECONCILIATION RECORD TESTS
// ============================================================================

describe("createReconciliationRecord", () => {
  it("should create record with correct fields", () => {
    const validation: PositionValidation = {
      symbol: "KXTEST-24SEP04",
      expDate: "2024-09-04",
      calculatedPnl: 4.50,
      reportedPnl: 5.00,
      discrepancy: 0.50,
      isValid: false,
      discrepancyPercent: 10,
    };

    const record = createReconciliationRecord(validation);

    expect(record.symbol).toBe("KXTEST-24SEP04");
    expect(record.gross_pnl).toBe(5.00); // Uses reported (source of truth)
    expect(record.calculated_pnl).toBe(4.50);
    expect(record.pnl_discrepancy).toBeCloseTo(0.50, 2);
  });
});

// ============================================================================
// SHOULD BLOCK IMPORT TESTS
// ============================================================================

describe("shouldBlockImport", () => {
  it("should not block when validation passes", () => {
    const result = {
      isValid: true,
      positions: [],
      failures: [],
      passes: [],
      priorPeriodIssues: [],
      bothSidedIssues: [],
      totalCalculatedPnl: 100.00,
      totalReportedPnl: 100.00,
      totalDiscrepancy: 0,
      adjustedDiscrepancy: 0,
      summary: "Valid",
    };

    const { block, reason } = shouldBlockImport(result);

    expect(block).toBe(false);
    expect(reason).toBeNull();
  });

  it("should block in strict mode when any failure", () => {
    const result = {
      isValid: false,
      positions: [],
      failures: [
        {
          symbol: "KXTEST",
          expDate: "2024-09-04",
          calculatedPnl: 4.99,
          reportedPnl: 5.00,
          discrepancy: 0.01,
          isValid: false,
          discrepancyPercent: 0.2,
        },
      ],
      passes: [],
      priorPeriodIssues: [],
      bothSidedIssues: [],
      totalCalculatedPnl: 4.99,
      totalReportedPnl: 5.00,
      totalDiscrepancy: 0.01,
      adjustedDiscrepancy: 0.01,
      summary: "Minor discrepancy",
    };

    const { block, reason } = shouldBlockImport(result, true); // strict mode

    expect(block).toBe(true);
    expect(reason).toContain("discrepancies exceed tolerance");
  });

  it("should block when discrepancy exceeds 10% of total P&L", () => {
    const result = {
      isValid: false,
      positions: [],
      failures: [
        {
          symbol: "KXTEST",
          expDate: "2024-09-04",
          calculatedPnl: 80.00,
          reportedPnl: 100.00,
          discrepancy: 20.00, // 20% discrepancy
          isValid: false,
          discrepancyPercent: 20,
        },
      ],
      passes: [],
      priorPeriodIssues: [],
      bothSidedIssues: [],
      totalCalculatedPnl: 80.00,
      totalReportedPnl: 100.00,
      totalDiscrepancy: 20.00,
      adjustedDiscrepancy: 20.00,
      summary: "Large discrepancy",
    };

    const { block, reason } = shouldBlockImport(result);

    expect(block).toBe(true);
    expect(reason).toContain("exceeds 10%");
  });

  it("should not block for minor discrepancies in non-strict mode", () => {
    const result = {
      isValid: false,
      positions: [],
      failures: [
        {
          symbol: "KXTEST",
          expDate: "2024-09-04",
          calculatedPnl: 99.00,
          reportedPnl: 100.00,
          discrepancy: 1.00,
          isValid: false,
          discrepancyPercent: 1,
        },
      ],
      passes: [],
      priorPeriodIssues: [],
      bothSidedIssues: [],
      totalCalculatedPnl: 99.00,
      totalReportedPnl: 100.00,
      totalDiscrepancy: 1.00,
      adjustedDiscrepancy: 1.00,
      summary: "Minor discrepancy",
    };

    const { block, reason } = shouldBlockImport(result);

    expect(block).toBe(false);
    expect(reason).toBeNull();
  });

  it("should warn but not block for discrepancies over $10", () => {
    const result = {
      isValid: false,
      positions: [],
      failures: [
        {
          symbol: "KXTEST",
          expDate: "2024-09-04",
          calculatedPnl: 985.00,
          reportedPnl: 1000.00,
          discrepancy: 15.00, // Over $10
          isValid: false,
          discrepancyPercent: 1.5, // But under 10%
        },
      ],
      passes: [],
      priorPeriodIssues: [],
      bothSidedIssues: [],
      totalCalculatedPnl: 985.00,
      totalReportedPnl: 1000.00,
      totalDiscrepancy: 15.00,
      adjustedDiscrepancy: 15.00,
      summary: "Moderate discrepancy",
    };

    const { block, reason } = shouldBlockImport(result);

    expect(block).toBe(false);
    expect(reason).toContain("over $10");
  });
});
