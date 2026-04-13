/**
 * Section 10 Parser Tests
 *
 * Tests for Account Summary utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  toAccountSummary,
  extractStatementMetadata,
  hasRequiredFields,
  validateSummaryConsistency,
  getTotalFees,
  getNetPnl,
  type AccountSummaryRaw,
} from "@/lib/parsing/robinhood/sections/section10";
import type { TextItem } from "@/lib/parsing/robinhood/types";

// ============================================================================
// HELPERS
// ============================================================================

function makeSummary(
  overrides: Partial<AccountSummaryRaw> = {}
): AccountSummaryRaw {
  return {
    beginningCashBalance: 1000,
    commissions: 10,
    exchangeFees: 5,
    nfaFees: 2,
    totalCommissionsAndFees: 17,
    grossProfitAndLoss: 200,
    eventContractTradeCosts: null,
    cashActivity: 500,
    endingCashBalance: 1500,
    openTradeEquity: 50,
    totalEquity: 1550,
    netLiquidity: 1550,
    eventContractsMarketValue: null,
    initialMargin: null,
    marginExcessDeficit: null,
    marginCall: null,
    ...overrides,
  };
}

function makeItem(text: string, x = 0, y = 0): TextItem {
  return { text, x, y, width: text.length * 5, height: 10, pageNumber: 1 };
}

// ============================================================================
// CONVERSION
// ============================================================================

describe("toAccountSummary", () => {
  it("should convert raw summary to AccountSummary", () => {
    const raw = makeSummary({ netLiquidity: 1550, endingCashBalance: 1500, totalCommissionsAndFees: 17 });
    const result = toAccountSummary(raw, "2024-09-30", "2024-09-01", "2024-09-30", "12345");
    expect(result.netLiquidity).toBe(1550);
    expect(result.endingCash).toBe(1500);
    expect(result.totalFees).toBe(17);
    expect(result.statementDate).toBe("2024-09-30");
    expect(result.periodStart).toBe("2024-09-01");
    expect(result.periodEnd).toBe("2024-09-30");
    expect(result.accountNumber).toBe("12345");
  });

  it("should default null values to 0", () => {
    const raw = makeSummary({ netLiquidity: null, endingCashBalance: null, totalCommissionsAndFees: null });
    const result = toAccountSummary(raw, "2024-09-30", "2024-09-01", "2024-09-30", "12345");
    expect(result.netLiquidity).toBe(0);
    expect(result.endingCash).toBe(0);
    expect(result.totalFees).toBe(0);
  });
});

// ============================================================================
// METADATA EXTRACTION
// ============================================================================

describe("extractStatementMetadata", () => {
  it("should extract account number", () => {
    const items = [makeItem("Account Number: ABC12345")];
    const meta = extractStatementMetadata(items);
    expect(meta.accountNumber).toBe("ABC12345");
  });

  it("should extract statement period with hyphen", () => {
    const items = [makeItem("Statement Period: 09/01/2024 - 09/30/2024")];
    const meta = extractStatementMetadata(items);
    expect(meta.periodStart).toBe("2024-09-01");
    expect(meta.periodEnd).toBe("2024-09-30");
  });

  it("should extract statement date", () => {
    const items = [makeItem("Statement Date: 09/30/2024")];
    const meta = extractStatementMetadata(items);
    expect(meta.statementDate).toBe("2024-09-30");
  });

  it("should extract 'As of' date", () => {
    const items = [makeItem("As of 09/30/2024")];
    const meta = extractStatementMetadata(items);
    expect(meta.statementDate).toBe("2024-09-30");
  });

  it("should handle From/To period format", () => {
    const items = [makeItem("From: 09/01/2024 To: 09/30/2024")];
    const meta = extractStatementMetadata(items);
    expect(meta.periodStart).toBe("2024-09-01");
    expect(meta.periodEnd).toBe("2024-09-30");
  });

  it("should return nulls for empty items", () => {
    const meta = extractStatementMetadata([]);
    expect(meta.accountNumber).toBeNull();
    expect(meta.statementDate).toBeNull();
    expect(meta.periodStart).toBeNull();
    expect(meta.periodEnd).toBeNull();
  });
});

// ============================================================================
// VALIDATION
// ============================================================================

describe("hasRequiredFields", () => {
  it("should return true when net liquidity and ending cash present", () => {
    expect(hasRequiredFields(makeSummary())).toBe(true);
  });

  it("should return false when net liquidity is null", () => {
    expect(hasRequiredFields(makeSummary({ netLiquidity: null }))).toBe(false);
  });

  it("should return false when both ending cash and total equity are null", () => {
    expect(
      hasRequiredFields(makeSummary({ endingCashBalance: null, totalEquity: null }))
    ).toBe(false);
  });

  it("should accept total equity as alternative to ending cash", () => {
    expect(
      hasRequiredFields(makeSummary({ endingCashBalance: null, totalEquity: 1000 }))
    ).toBe(true);
  });
});

describe("validateSummaryConsistency", () => {
  it("should return no errors for consistent summary", () => {
    const summary = makeSummary({
      totalCommissionsAndFees: 17,
      commissions: 10,
      exchangeFees: 5,
      nfaFees: 2,
    });
    const errors = validateSummaryConsistency(summary);
    expect(errors).toHaveLength(0);
  });

  it("should detect fee total inconsistency", () => {
    const summary = makeSummary({
      totalCommissionsAndFees: 50,
      commissions: 10,
      exchangeFees: 5,
      nfaFees: 2,
    });
    const errors = validateSummaryConsistency(summary);
    expect(errors.some((e) => e.includes("Fee total inconsistency"))).toBe(true);
  });

  it("should detect net liquidity vs total equity difference", () => {
    const summary = makeSummary({
      netLiquidity: 1000,
      totalEquity: 500,
    });
    const errors = validateSummaryConsistency(summary);
    expect(errors.some((e) => e.includes("Net Liquidity"))).toBe(true);
  });
});

// ============================================================================
// FEE UTILITIES
// ============================================================================

describe("getTotalFees", () => {
  it("should return totalCommissionsAndFees when available", () => {
    expect(getTotalFees(makeSummary({ totalCommissionsAndFees: 25 }))).toBe(25);
  });

  it("should calculate from components when total is null", () => {
    const summary = makeSummary({
      totalCommissionsAndFees: null,
      commissions: 10,
      exchangeFees: 5,
      nfaFees: 2,
    });
    expect(getTotalFees(summary)).toBe(17);
  });
});

describe("getNetPnl", () => {
  it("should return gross P&L minus fees", () => {
    const summary = makeSummary({
      grossProfitAndLoss: 200,
      totalCommissionsAndFees: 17,
    });
    expect(getNetPnl(summary)).toBe(183);
  });

  it("should return null when gross P&L is null", () => {
    expect(getNetPnl(makeSummary({ grossProfitAndLoss: null }))).toBeNull();
  });
});
