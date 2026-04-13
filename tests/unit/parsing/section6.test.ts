/**
 * Section 6 Parser Tests
 *
 * Tests for Journal Entries utility functions and cash flow classification.
 */

import { describe, it, expect } from "vitest";
import {
  classifyCashFlow,
  inferCashFlowType,
  toJournalEntry,
  getTotalDeposits,
  getTotalWithdrawals,
  getTotalFees,
  getNetCashActivity,
  filterByType,
  filterByDateRange,
  groupByType,
  type JournalEntryRow,
  type CashFlowType,
} from "@/lib/parsing/robinhood/sections/section6";

// ============================================================================
// HELPERS
// ============================================================================

function makeEntry(
  overrides: Partial<JournalEntryRow> = {}
): JournalEntryRow {
  return {
    date: "2024-09-04",
    accountType: "SW",
    description: "ACH Credit - Deposit",
    currency: "USD",
    creditDebit: 100.0,
    balance: 500.0,
    type: "DEPOSIT",
    ...overrides,
  };
}

// ============================================================================
// CASH FLOW CLASSIFICATION
// ============================================================================

describe("classifyCashFlow", () => {
  it("should classify deposit keywords", () => {
    expect(classifyCashFlow("ACH Credit - Deposit")).toBe("DEPOSIT");
    expect(classifyCashFlow("Transfer In")).toBe("DEPOSIT");
    expect(classifyCashFlow("Wire In from bank")).toBe("DEPOSIT");
    expect(classifyCashFlow("Account Funding")).toBe("DEPOSIT");
  });

  it("should classify withdrawal keywords", () => {
    expect(classifyCashFlow("Withdrawal")).toBe("WITHDRAWAL");
    expect(classifyCashFlow("Transfer Out")).toBe("WITHDRAWAL");
    expect(classifyCashFlow("ACH Debit")).toBe("WITHDRAWAL");
    expect(classifyCashFlow("Distribution")).toBe("WITHDRAWAL");
  });

  it("should classify interest keywords", () => {
    expect(classifyCashFlow("Interest Payment")).toBe("INTEREST");
    expect(classifyCashFlow("Dividend")).toBe("INTEREST");
    expect(classifyCashFlow("Yield earned")).toBe("INTEREST");
  });

  it("should classify fee keywords", () => {
    expect(classifyCashFlow("Monthly Fee")).toBe("FEE");
    expect(classifyCashFlow("Commission charge")).toBe("FEE");
  });

  it("should classify adjustment keywords", () => {
    expect(classifyCashFlow("Balance Adjustment")).toBe("ADJUSTMENT");
    expect(classifyCashFlow("Correction entry")).toBe("ADJUSTMENT");
    expect(classifyCashFlow("Reversal")).toBe("ADJUSTMENT");
    expect(classifyCashFlow("Rebate")).toBe("ADJUSTMENT");
  });

  it("should return OTHER for unknown descriptions", () => {
    expect(classifyCashFlow("Random text")).toBe("OTHER");
    expect(classifyCashFlow("")).toBe("OTHER");
  });
});

describe("inferCashFlowType", () => {
  it("should use description when possible", () => {
    expect(inferCashFlowType("Deposit from bank", 100)).toBe("DEPOSIT");
    expect(inferCashFlowType("Fee charged", -5)).toBe("FEE");
  });

  it("should infer from amount when description is unclear", () => {
    expect(inferCashFlowType("Unknown entry", 100)).toBe("DEPOSIT");
    expect(inferCashFlowType("Unknown entry", -50)).toBe("WITHDRAWAL");
    expect(inferCashFlowType("Unknown entry", 0)).toBe("OTHER");
  });
});

// ============================================================================
// CONVERSION
// ============================================================================

describe("toJournalEntry", () => {
  it("should convert row to JournalEntry type", () => {
    const row = makeEntry({ date: "2024-09-04", type: "DEPOSIT", creditDebit: 100, description: "Test" });
    const entry = toJournalEntry(row);
    expect(entry.date).toBe("2024-09-04");
    expect(entry.type).toBe("DEPOSIT");
    expect(entry.amount).toBe(100);
    expect(entry.description).toBe("Test");
  });
});

// ============================================================================
// AGGREGATION
// ============================================================================

describe("getTotalDeposits", () => {
  it("should sum deposit amounts", () => {
    const entries = [
      makeEntry({ type: "DEPOSIT", creditDebit: 100 }),
      makeEntry({ type: "DEPOSIT", creditDebit: 200 }),
      makeEntry({ type: "WITHDRAWAL", creditDebit: -50 }),
    ];
    expect(getTotalDeposits(entries)).toBe(300);
  });
});

describe("getTotalWithdrawals", () => {
  it("should sum withdrawal amounts (absolute)", () => {
    const entries = [
      makeEntry({ type: "WITHDRAWAL", creditDebit: -50 }),
      makeEntry({ type: "WITHDRAWAL", creditDebit: -30 }),
      makeEntry({ type: "DEPOSIT", creditDebit: 100 }),
    ];
    expect(getTotalWithdrawals(entries)).toBe(80);
  });
});

describe("getTotalFees", () => {
  it("should sum fee amounts (absolute)", () => {
    const entries = [
      makeEntry({ type: "FEE", creditDebit: -5 }),
      makeEntry({ type: "FEE", creditDebit: -3 }),
    ];
    expect(getTotalFees(entries)).toBe(8);
  });
});

describe("getNetCashActivity", () => {
  it("should sum all creditDebit values", () => {
    const entries = [
      makeEntry({ creditDebit: 100 }),
      makeEntry({ creditDebit: -30 }),
      makeEntry({ creditDebit: -20 }),
    ];
    expect(getNetCashActivity(entries)).toBe(50);
  });
});

// ============================================================================
// FILTERING
// ============================================================================

describe("filterByType", () => {
  it("should filter entries by type", () => {
    const entries = [
      makeEntry({ type: "DEPOSIT" }),
      makeEntry({ type: "WITHDRAWAL" }),
      makeEntry({ type: "DEPOSIT" }),
    ];
    expect(filterByType(entries, "DEPOSIT")).toHaveLength(2);
    expect(filterByType(entries, "WITHDRAWAL")).toHaveLength(1);
    expect(filterByType(entries, "FEE")).toHaveLength(0);
  });
});

describe("filterByDateRange", () => {
  it("should filter by date range (inclusive)", () => {
    const entries = [
      makeEntry({ date: "2024-09-01" }),
      makeEntry({ date: "2024-09-05" }),
      makeEntry({ date: "2024-09-10" }),
      makeEntry({ date: "2024-09-15" }),
    ];
    const filtered = filterByDateRange(entries, "2024-09-05", "2024-09-10");
    expect(filtered).toHaveLength(2);
  });
});

describe("groupByType", () => {
  it("should group entries by type", () => {
    const entries = [
      makeEntry({ type: "DEPOSIT" }),
      makeEntry({ type: "DEPOSIT" }),
      makeEntry({ type: "FEE" }),
    ];
    const groups = groupByType(entries);
    expect(groups.get("DEPOSIT")).toHaveLength(2);
    expect(groups.get("FEE")).toHaveLength(1);
    expect(groups.has("WITHDRAWAL")).toBe(false);
  });
});
