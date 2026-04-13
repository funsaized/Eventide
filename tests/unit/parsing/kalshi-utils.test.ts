/**
 * Kalshi Utils Tests
 *
 * TDD tests for Kalshi CSV parsing utilities.
 */

import { describe, it, expect } from "vitest";
import {
  centsToDecimal,
  parseIsoTimestamp,
  parseCsvLine,
  stripBom,
  normalizeSide,
} from "@/lib/parsing/kalshi/utils";

// ============================================================================
// centsToDecimal
// ============================================================================

describe("centsToDecimal", () => {
  it("should return 0 for 0 cents", () => {
    expect(centsToDecimal(0)).toBe(0);
  });

  it("should convert 350 cents to 3.50", () => {
    expect(centsToDecimal(350)).toBe(3.5);
  });

  it("should convert negative 996 cents to -9.96", () => {
    expect(centsToDecimal(-996)).toBe(-9.96);
  });

  it("should convert 6500 cents to 65.00", () => {
    expect(centsToDecimal(6500)).toBe(65);
  });

  it("should convert 999999 cents to 9999.99", () => {
    expect(centsToDecimal(999999)).toBe(9999.99);
  });

  it("should convert 1 cent to 0.01", () => {
    expect(centsToDecimal(1)).toBe(0.01);
  });

  it("should convert negative 1 cent to -0.01", () => {
    expect(centsToDecimal(-1)).toBe(-0.01);
  });
});

// ============================================================================
// parseIsoTimestamp
// ============================================================================

describe("parseIsoTimestamp", () => {
  it("should parse timezone-offset timestamp to YYYY-MM-DD", () => {
    expect(parseIsoTimestamp("2026-01-24T14:53:59-05:00")).toBe("2026-01-24");
  });

  it("should parse UTC timestamp with milliseconds to YYYY-MM-DD", () => {
    expect(parseIsoTimestamp("2026-04-06T10:24:46.311Z")).toBe("2026-04-06");
  });

  it("should parse another timezone-offset timestamp correctly", () => {
    expect(parseIsoTimestamp("2026-02-05T10:41:45-05:00")).toBe("2026-02-05");
  });

  it("should throw Error for invalid timestamp", () => {
    expect(() => parseIsoTimestamp("invalid")).toThrow(
      "Invalid ISO 8601 timestamp: invalid",
    );
  });
});

// ============================================================================
// parseCsvLine
// ============================================================================

describe("parseCsvLine", () => {
  it("should parse simple unquoted fields", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("should parse quoted fields", () => {
    expect(parseCsvLine('"a","b","c"')).toEqual(["a", "b", "c"]);
  });

  it("should handle quoted field containing comma", () => {
    expect(parseCsvLine('"has,comma",b')).toEqual(["has,comma", "b"]);
  });

  it("should handle escaped quotes within quoted field", () => {
    expect(parseCsvLine('"quoted ""value""",b')).toEqual(['quoted "value"', "b"]);
  });

  it("should handle empty fields at start", () => {
    expect(parseCsvLine(",,")).toEqual(["", "", ""]);
  });

  it("should handle empty line", () => {
    expect(parseCsvLine("")).toEqual([""]);
  });

  it("should handle single unquoted field", () => {
    expect(parseCsvLine("hello")).toEqual(["hello"]);
  });

  it("should parse Transactions CSV header with 12 fields", () => {
    const header =
      "type,quantity,market_ticker,side,entry_price_cents,exit_price_cents,open_fees_cents,close_fees_cents,realized_pnl_without_fees_cents,realized_pnl_with_fees_cents,close_timestamp,open_timestamp";
    const fields = parseCsvLine(header);
    expect(fields).toHaveLength(12);
  });
});

// ============================================================================
// stripBom
// ============================================================================

describe("stripBom", () => {
  it("should strip BOM from start of string", () => {
    expect(stripBom("\uFEFFhello")).toBe("hello");
  });

  it("should return original string if no BOM present", () => {
    expect(stripBom("hello")).toBe("hello");
  });

  it("should return empty string for empty input", () => {
    expect(stripBom("")).toBe("");
  });

  it("should return empty string for BOM only", () => {
    expect(stripBom("\uFEFF")).toBe("");
  });
});

// ============================================================================
// normalizeSide
// ============================================================================

describe("normalizeSide", () => {
  it("should normalize lowercase yes to YES", () => {
    expect(normalizeSide("yes")).toBe("YES");
  });

  it("should normalize lowercase no to NO", () => {
    expect(normalizeSide("no")).toBe("NO");
  });

  it("should pass through uppercase YES", () => {
    expect(normalizeSide("YES")).toBe("YES");
  });

  it("should pass through uppercase NO", () => {
    expect(normalizeSide("NO")).toBe("NO");
  });

  it("should throw Error for invalid side value", () => {
    expect(() => normalizeSide("invalid")).toThrow(
      'Invalid Kalshi side value: "invalid". Expected "yes" or "no".',
    );
  });

  it("should throw Error for empty string", () => {
    expect(() => normalizeSide("")).toThrow(
      'Invalid Kalshi side value: "". Expected "yes" or "no".',
    );
  });
});
