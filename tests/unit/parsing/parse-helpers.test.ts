/**
 * Parse Helpers Tests
 *
 * Tests for shared parsing utility functions used across section parsers.
 */

import { describe, it, expect } from "vitest";
import {
  parseDateToISO,
  parseQuantity,
  parseTradePrice,
  parseCurrencyValue,
  parseTradeSide,
  parseTradeType,
} from "@/lib/parsing/robinhood/sections/parse-helpers";

// ============================================================================
// DATE PARSING
// ============================================================================

describe("parseDateToISO", () => {
  it("should parse ISO format dates", () => {
    expect(parseDateToISO("2024-09-04")).toBe("2024-09-04");
  });

  it("should parse US format dates", () => {
    expect(parseDateToISO("9/4/2024")).toBe("2024-09-04");
    expect(parseDateToISO("09/04/2024")).toBe("2024-09-04");
  });

  it("should parse long month format dates", () => {
    expect(parseDateToISO("Sep 4, 2024")).toBe("2024-09-04");
    expect(parseDateToISO("September 4, 2024")).toBe("2024-09-04");
  });

  it("should handle spaces around hyphens from PDF concatenation", () => {
    expect(parseDateToISO("2024-09- 04")).toBe("2024-09-04");
  });

  it("should return null for empty/invalid input", () => {
    expect(parseDateToISO("")).toBeNull();
    expect(parseDateToISO("not-a-date")).toBeNull();
  });
});

// ============================================================================
// QUANTITY PARSING
// ============================================================================

describe("parseQuantity", () => {
  it("should parse simple integers", () => {
    expect(parseQuantity("10")).toBe(10);
    expect(parseQuantity("100")).toBe(100);
  });

  it("should handle comma separators", () => {
    expect(parseQuantity("1,000")).toBe(1000);
  });

  it("should handle whitespace", () => {
    expect(parseQuantity(" 50 ")).toBe(50);
  });

  it("should return 0 for empty or invalid input", () => {
    expect(parseQuantity("")).toBe(0);
    expect(parseQuantity("abc")).toBe(0);
  });
});

// ============================================================================
// TRADE PRICE PARSING
// ============================================================================

describe("parseTradePrice", () => {
  it("should parse regular decimal prices", () => {
    expect(parseTradePrice("0.65")).toBe(0.65);
    expect(parseTradePrice("1.00")).toBe(1.0);
    expect(parseTradePrice("0.00")).toBe(0.0);
  });

  it("should handle scientific notation", () => {
    expect(parseTradePrice("0E-8")).toBe(0);
    expect(parseTradePrice("1E0")).toBe(1);
  });

  it("should strip dollar signs and commas", () => {
    expect(parseTradePrice("$0.50")).toBe(0.5);
  });

  it("should return null for empty/invalid input", () => {
    expect(parseTradePrice("")).toBeNull();
    expect(parseTradePrice("abc")).toBeNull();
  });
});

// ============================================================================
// CURRENCY VALUE PARSING
// ============================================================================

describe("parseCurrencyValue", () => {
  it("should parse positive values", () => {
    expect(parseCurrencyValue("$123.45")).toBe(123.45);
    expect(parseCurrencyValue("50.00")).toBe(50.0);
  });

  it("should parse negative values with minus sign", () => {
    expect(parseCurrencyValue("-25.00")).toBe(-25.0);
    expect(parseCurrencyValue("-$25.00")).toBe(-25.0);
  });

  it("should parse parenthesized negative values", () => {
    expect(parseCurrencyValue("(50.00)")).toBe(-50.0);
    expect(parseCurrencyValue("($50.00)")).toBe(-50.0);
  });

  it("should return null for empty/invalid input", () => {
    expect(parseCurrencyValue("")).toBeNull();
    expect(parseCurrencyValue("abc")).toBeNull();
  });
});

// ============================================================================
// TRADE SIDE PARSING
// ============================================================================

describe("parseTradeSide", () => {
  it("should parse YES side", () => {
    expect(parseTradeSide("YES")).toBe("YES");
    expect(parseTradeSide("yes")).toBe("YES");
    expect(parseTradeSide("Y")).toBe("YES");
  });

  it("should parse NO side", () => {
    expect(parseTradeSide("NO")).toBe("NO");
    expect(parseTradeSide("no")).toBe("NO");
    expect(parseTradeSide("N")).toBe("NO");
  });

  it("should return null for invalid input", () => {
    expect(parseTradeSide("")).toBeNull();
    expect(parseTradeSide("MAYBE")).toBeNull();
  });
});

// ============================================================================
// TRADE TYPE PARSING
// ============================================================================

describe("parseTradeType", () => {
  it("should parse Trade type", () => {
    expect(parseTradeType("Trade")).toBe("Trade");
    expect(parseTradeType("trade")).toBe("Trade");
  });

  it("should parse Final Settlement type", () => {
    expect(parseTradeType("Final Settlement")).toBe("Final Settlement");
    expect(parseTradeType("final settlement")).toBe("Final Settlement");
    expect(parseTradeType("Settlement")).toBe("Final Settlement");
  });

  it("should default to Trade for empty input", () => {
    expect(parseTradeType("")).toBe("Trade");
  });
});
