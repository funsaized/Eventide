/**
 * Parsing Utils Tests
 *
 * Tests for text anchor finding, section detection, column detection,
 * date parsing, and value parsing utilities.
 */

import { describe, it, expect } from "vitest";
import {
  findTextAnchor,
  findAllTextAnchors,
  detectSectionType,
  isSectionHeader,
  parseDate,
  parseCurrency,
  parseInteger,
  parsePrice,
  categorizeSymbol,
  parseSymbol,
  isDataRow,
  isTableContinuation,
  cleanText,
  isEmptyText,
  extractAccountNumber,
  extractStatementDate,
  extractStatementPeriod,
  detectColumnPositions,
  getColumnForItem,
  TRADE_COLUMN_HEADERS,
} from "@/lib/parsing/robinhood/utils";
import type { TextItem } from "@/lib/parsing/robinhood/types";

// ============================================================================
// HELPERS
// ============================================================================

function makeItem(text: string, x = 0, y = 0): TextItem {
  return { text, x, y, width: text.length * 5, height: 10, pageNumber: 1 };
}

// ============================================================================
// TEXT ANCHOR FINDING
// ============================================================================

describe("findTextAnchor", () => {
  it("should find a matching text item", () => {
    const items = [makeItem("Hello"), makeItem("Monthly Trade Confirmations"), makeItem("World")];
    const result = findTextAnchor(items, /Monthly\s+Trade/i);
    expect(result).not.toBeNull();
    expect(result!.index).toBe(1);
  });

  it("should return null when no match found", () => {
    const items = [makeItem("Hello"), makeItem("World")];
    expect(findTextAnchor(items, /Missing/)).toBeNull();
  });

  it("should return the first match", () => {
    const items = [makeItem("Trade A"), makeItem("Trade B")];
    const result = findTextAnchor(items, /Trade/);
    expect(result!.index).toBe(0);
  });
});

describe("findAllTextAnchors", () => {
  it("should find all matching text items", () => {
    const items = [makeItem("Trade A"), makeItem("Other"), makeItem("Trade B")];
    const results = findAllTextAnchors(items, /Trade/);
    expect(results).toHaveLength(2);
    expect(results[0].index).toBe(0);
    expect(results[1].index).toBe(2);
  });

  it("should return empty array when no matches", () => {
    const items = [makeItem("Hello")];
    expect(findAllTextAnchors(items, /Missing/)).toHaveLength(0);
  });
});

// ============================================================================
// SECTION DETECTION
// ============================================================================

describe("detectSectionType", () => {
  it("should detect header section", () => {
    expect(detectSectionType("Robinhood Derivatives")).toBe("header");
  });

  it("should detect trades section", () => {
    expect(detectSectionType("Monthly Trade Confirmations")).toBe("trades");
  });

  it("should detect journal section", () => {
    expect(detectSectionType("Journal Entries")).toBe("journal");
  });

  it("should detect open positions section", () => {
    expect(detectSectionType("Open Positions")).toBe("open_positions");
  });

  it("should detect account summary section", () => {
    expect(detectSectionType("Account Summary")).toBe("account_summary");
  });

  it("should return unknown for unrecognized text", () => {
    expect(detectSectionType("Random text")).toBe("unknown");
  });
});

describe("isSectionHeader", () => {
  it("should return true for section headers", () => {
    expect(isSectionHeader("Monthly Trade Confirmations")).toBe(true);
    expect(isSectionHeader("Account Summary")).toBe(true);
  });

  it("should return false for non-headers", () => {
    expect(isSectionHeader("Some random text")).toBe(false);
  });
});

// ============================================================================
// DATE PARSING
// ============================================================================

describe("parseDate", () => {
  it("should parse ISO format", () => {
    expect(parseDate("2024-09-04")).toBe("2024-09-04");
  });

  it("should parse US date format", () => {
    expect(parseDate("9/4/2024")).toBe("2024-09-04");
    expect(parseDate("09/04/2024")).toBe("2024-09-04");
  });

  it("should parse abbreviated month format", () => {
    expect(parseDate("Sep 4, 2024")).toBe("2024-09-04");
  });

  it("should parse full month format", () => {
    expect(parseDate("September 4, 2024")).toBe("2024-09-04");
  });

  it("should handle spaces around hyphens from PDF text", () => {
    expect(parseDate("2025-09- 20")).toBe("2025-09-20");
  });

  it("should handle spaces around slashes from PDF text", () => {
    expect(parseDate("09/ 04/ 2024")).toBe("2024-09-04");
  });

  it("should return null for empty input", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate("  ")).toBeNull();
  });

  it("should return null for invalid dates", () => {
    expect(parseDate("not-a-date")).toBeNull();
    expect(parseDate("abc/def/ghi")).toBeNull();
  });
});

// ============================================================================
// VALUE PARSING
// ============================================================================

describe("parseCurrency", () => {
  it("should parse positive values", () => {
    expect(parseCurrency("$123.45")).toBe(123.45);
    expect(parseCurrency("100.00")).toBe(100.0);
  });

  it("should parse negative values with parentheses", () => {
    expect(parseCurrency("(50.00)")).toBe(-50.0);
    expect(parseCurrency("($50.00)")).toBe(-50.0);
  });

  it("should parse values with commas", () => {
    expect(parseCurrency("$1,234.56")).toBe(1234.56);
  });

  it("should return null for non-numeric", () => {
    expect(parseCurrency("abc")).toBeNull();
  });
});

describe("parseInteger", () => {
  it("should parse simple integers", () => {
    expect(parseInteger("42")).toBe(42);
    expect(parseInteger("0")).toBe(0);
  });

  it("should handle commas", () => {
    expect(parseInteger("1,000")).toBe(1000);
  });

  it("should return null for non-numeric", () => {
    expect(parseInteger("abc")).toBeNull();
  });
});

describe("parsePrice", () => {
  it("should parse decimal prices", () => {
    expect(parsePrice("0.65")).toBe(0.65);
    expect(parsePrice("1.00")).toBe(1.0);
  });

  it("should strip dollar signs", () => {
    expect(parsePrice("$0.50")).toBe(0.5);
  });

  it("should return null for non-numeric", () => {
    expect(parsePrice("abc")).toBeNull();
  });
});

// ============================================================================
// SYMBOL CATEGORIZATION
// ============================================================================

describe("categorizeSymbol", () => {
  it("should categorize NFL symbols", () => {
    expect(categorizeSymbol("KXNFLGAME-25SEP04")).toBe("NFL");
  });

  it("should categorize NBA symbols", () => {
    expect(categorizeSymbol("KXNBAGAME-25FEB10")).toBe("NBA");
  });

  it("should categorize Crypto symbols", () => {
    expect(categorizeSymbol("KXBTC-24SEP04-55000")).toBe("Crypto");
  });

  it("should categorize Economics symbols", () => {
    expect(categorizeSymbol("KXFED-24MAR20-RATE")).toBe("Economics");
  });

  it("should categorize Politics symbols", () => {
    expect(categorizeSymbol("KXELECTION-24NOV05")).toBe("Politics");
  });

  it("should return Other for unknown symbols", () => {
    expect(categorizeSymbol("UNKNOWN-SYMBOL")).toBe("Other");
  });
});

describe("parseSymbol", () => {
  it("should parse a multi-part symbol", () => {
    const result = parseSymbol("KXNFLGAME-25SEP04DALPHI-PHI");
    expect(result.raw).toBe("KXNFLGAME-25SEP04DALPHI-PHI");
    expect(result.category).toBe("NFL");
    expect(result.exchange).toBe("KXN"); // regex captures 2-3 uppercase chars
    expect(result.participants).toEqual(["PHI"]);
  });

  it("should handle simple symbols", () => {
    const result = parseSymbol("KXBTC");
    expect(result.category).toBe("Crypto");
    expect(result.exchange).toBe("KXB"); // regex captures 2-3 uppercase chars
  });

  it("should handle unknown category", () => {
    const result = parseSymbol("SOMETHING");
    expect(result.category).toBe("Other");
  });
});

// ============================================================================
// ROW DETECTION
// ============================================================================

describe("isDataRow", () => {
  it("should detect rows starting with dates", () => {
    expect(isDataRow("9/4/2024 YES KXBTC 0.65")).toBe(true);
  });

  it("should detect rows with numeric values", () => {
    expect(isDataRow("Some text 123.45 more")).toBe(true);
  });

  it("should reject section headers", () => {
    expect(isDataRow("Monthly Trade Confirmations")).toBe(false);
  });

  it("should reject page footers", () => {
    expect(isDataRow("Page 1 continued")).toBe(false);
  });
});

describe("isTableContinuation", () => {
  it("should detect repeated headers", () => {
    expect(isTableContinuation("Date Subtype Symbol Price Qty", TRADE_COLUMN_HEADERS)).toBe(true);
  });

  it("should reject non-header text", () => {
    expect(isTableContinuation("Some random data", TRADE_COLUMN_HEADERS)).toBe(false);
  });
});

// ============================================================================
// TEXT UTILITIES
// ============================================================================

describe("cleanText", () => {
  it("should normalize whitespace", () => {
    expect(cleanText("  hello   world  ")).toBe("hello world");
  });

  it("should remove zero-width characters", () => {
    expect(cleanText("hello\u200Bworld")).toBe("helloworld");
  });
});

describe("isEmptyText", () => {
  it("should return true for whitespace-only text", () => {
    expect(isEmptyText("   ")).toBe(true);
    expect(isEmptyText("")).toBe(true);
  });

  it("should return false for text with content", () => {
    expect(isEmptyText("hello")).toBe(false);
  });
});

// ============================================================================
// ACCOUNT EXTRACTION
// ============================================================================

describe("extractAccountNumber", () => {
  it("should extract account number with Account: prefix", () => {
    const items = [makeItem("Account: ABC123456")];
    expect(extractAccountNumber(items)).toBe("ABC123456");
  });

  it("should extract standalone account number pattern", () => {
    const items = [makeItem("AB12345678")];
    expect(extractAccountNumber(items)).toBe("AB12345678");
  });

  it("should return null when no account found", () => {
    const items = [makeItem("Random text")];
    expect(extractAccountNumber(items)).toBeNull();
  });
});

describe("extractStatementDate", () => {
  it("should extract from Statement Period format", () => {
    const items = [makeItem("Statement Period: September 4, 2024")];
    expect(extractStatementDate(items)).toBe("2024-09-04");
  });

  it("should extract end date from date range", () => {
    const items = [makeItem("09/01/2024 - 09/30/2024")];
    expect(extractStatementDate(items)).toBe("2024-09-30");
  });

  it("should return null for no dates", () => {
    expect(extractStatementDate([makeItem("No dates here")])).toBeNull();
  });
});

describe("extractStatementPeriod", () => {
  it("should extract date range", () => {
    const items = [makeItem("09/01/2024 - 09/30/2024")];
    const [start, end] = extractStatementPeriod(items);
    expect(start).toBe("2024-09-01");
    expect(end).toBe("2024-09-30");
  });

  it("should derive period from statement date", () => {
    const items = [makeItem("Statement Period: September 15, 2024")];
    const [start, end] = extractStatementPeriod(items);
    expect(start).toBe("2024-09-01");
    expect(end).toBe("2024-09-30");
  });

  it("should return nulls when no dates found", () => {
    const [start, end] = extractStatementPeriod([makeItem("No dates")]);
    expect(start).toBeNull();
    expect(end).toBeNull();
  });
});

// ============================================================================
// COLUMN DETECTION
// ============================================================================

describe("detectColumnPositions", () => {
  it("should detect column positions from header items", () => {
    const headers = [
      makeItem("Date", 10),
      makeItem("Symbol", 100),
      makeItem("Price", 300),
    ];
    const layout = detectColumnPositions(headers, 612, ["Date", "Symbol", "Price"]);
    expect(layout.columns).toHaveLength(3);
    expect(layout.columns[0].name).toBe("Date");
    expect(layout.columns[1].name).toBe("Symbol");
    expect(layout.columns[2].name).toBe("Price");
  });

  it("should set last column right edge to page width", () => {
    const headers = [makeItem("Date", 10), makeItem("Price", 300)];
    const layout = detectColumnPositions(headers, 612, ["Date", "Price"]);
    expect(layout.columns[1].rightAbsolute).toBe(612);
  });
});

describe("getColumnForItem", () => {
  it("should assign item to correct column", () => {
    const layout = {
      pageWidth: 612,
      columns: [
        { name: "Date", leftPercent: 0, rightPercent: 0.15, leftAbsolute: 0, rightAbsolute: 95 },
        { name: "Symbol", leftPercent: 0.16, rightPercent: 0.5, leftAbsolute: 100, rightAbsolute: 300 },
      ],
    };
    const item = makeItem("2024-01-01", 20);
    expect(getColumnForItem(item, layout)).toBe("Date");
  });

  it("should fall back to closest column", () => {
    const layout = {
      pageWidth: 612,
      columns: [
        { name: "Date", leftPercent: 0, rightPercent: 0.1, leftAbsolute: 0, rightAbsolute: 60 },
        { name: "Symbol", leftPercent: 0.5, rightPercent: 1, leftAbsolute: 300, rightAbsolute: 612 },
      ],
    };
    // Item at x=80 is between columns, should fall back to closest
    const item = makeItem("test", 80);
    const result = getColumnForItem(item, layout);
    expect(result).toBe("Date"); // closer to Date column
  });
});
