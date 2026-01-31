/**
 * Symbol Parsing Tests
 *
 * Tests for symbol categorization and parsing utilities.
 */

import { describe, it, expect } from "vitest";
import {
  CATEGORY_PATTERNS,
  extractEventDate,
  formatEventDate,
  extractExchange,
  extractEventType,
  extractParticipants,
  categorizeSymbol,
  getSubcategory,
  parseSymbol,
  getBaseSymbol,
  isSameEvent,
  getOutcome,
  isBinaryMarket,
  getEventDescription,
  groupByCategory,
  getCategoryStats,
} from "@/lib/parsing/symbol";

describe("CATEGORY_PATTERNS", () => {
  it("should have patterns for all major categories", () => {
    const categories = new Set(CATEGORY_PATTERNS.map(p => p.category));

    expect(categories.has("NFL")).toBe(true);
    expect(categories.has("NBA")).toBe(true);
    expect(categories.has("MLB")).toBe(true);
    expect(categories.has("NHL")).toBe(true);
    expect(categories.has("Economics")).toBe(true);
    expect(categories.has("Politics")).toBe(true);
    expect(categories.has("Weather")).toBe(true);
  });
});

describe("categorizeSymbol", () => {
  it("should categorize NFL symbols", () => {
    expect(categorizeSymbol("KXNFLGAME-24SEP04DALPHI-DAL")).toBe("NFL");
    expect(categorizeSymbol("KXNFLPLAYER-24SEP04")).toBe("NFL");
    expect(categorizeSymbol("KXSUPERBOWL59")).toBe("NFL");
  });

  it("should categorize NBA symbols", () => {
    expect(categorizeSymbol("KXNBAGAME-24SEP20LAKBOS-LAK")).toBe("NBA");
    expect(categorizeSymbol("KXNBAFINALS24")).toBe("NBA");
  });

  it("should categorize MLB symbols", () => {
    expect(categorizeSymbol("KXMLBGAME-24SEP15")).toBe("MLB");
    expect(categorizeSymbol("KXWORLDSERIES24")).toBe("MLB");
  });

  it("should categorize NHL symbols", () => {
    expect(categorizeSymbol("KXNHLGAME-24OCT15")).toBe("NHL");
    expect(categorizeSymbol("KXSTANLEYCUP25")).toBe("NHL");
  });

  it("should categorize Economics symbols", () => {
    expect(categorizeSymbol("KXFEDRATE-24SEP18-25BPCUT")).toBe("Economics");
    expect(categorizeSymbol("KXFOMC-24SEP18")).toBe("Economics");
    expect(categorizeSymbol("KXCPI-24SEP")).toBe("Economics");
    expect(categorizeSymbol("KXGDP-24Q3")).toBe("Economics");
    expect(categorizeSymbol("KXJOBS-24SEP")).toBe("Economics");
    expect(categorizeSymbol("KXNFP-24SEP")).toBe("Economics");
  });

  it("should categorize Politics symbols", () => {
    expect(categorizeSymbol("KXELECTION2024")).toBe("Politics");
    expect(categorizeSymbol("KXPRESIDENT24")).toBe("Politics");
    expect(categorizeSymbol("KXSENATE24")).toBe("Politics");
  });

  it("should categorize Soccer symbols", () => {
    expect(categorizeSymbol("KXSOCCER-24SEP15")).toBe("Soccer");
    expect(categorizeSymbol("KXMLS-24SEP15")).toBe("Soccer");
    expect(categorizeSymbol("KXWORLDCUP26")).toBe("Soccer");
  });

  it("should categorize Tennis symbols", () => {
    expect(categorizeSymbol("KXUSOMEN-24SEP01")).toBe("Tennis");
    expect(categorizeSymbol("KXWIMBLEDON24")).toBe("Tennis");
  });

  it("should categorize Golf symbols", () => {
    expect(categorizeSymbol("KXGOLF-24SEP15")).toBe("Golf");
    expect(categorizeSymbol("KXMASTERS25")).toBe("Golf");
    expect(categorizeSymbol("KXPGACHAMP24")).toBe("Golf");
  });

  it("should categorize Weather symbols", () => {
    expect(categorizeSymbol("KXWEATHER-24SEP15")).toBe("Weather");
    expect(categorizeSymbol("KXTEMP-NYC-24SEP")).toBe("Weather");
    expect(categorizeSymbol("KXHURRICANE-24")).toBe("Weather");
  });

  it("should categorize Crypto symbols", () => {
    expect(categorizeSymbol("KXBTC-50K-24SEP")).toBe("Crypto");
    expect(categorizeSymbol("KXBITCOIN-24SEP")).toBe("Crypto");
    expect(categorizeSymbol("KXETH-24SEP")).toBe("Crypto");
  });

  it("should categorize Entertainment symbols", () => {
    expect(categorizeSymbol("KXOSCAR25")).toBe("Entertainment");
    expect(categorizeSymbol("KXEMMY24")).toBe("Entertainment");
    expect(categorizeSymbol("KXBOXOFFICE-24SEP")).toBe("Entertainment");
  });

  it("should return Other for unknown symbols", () => {
    expect(categorizeSymbol("UNKNOWN")).toBe("Other");
    expect(categorizeSymbol("KXRANDOM")).toBe("Other");
  });
});

describe("extractEventDate", () => {
  it("should extract YYMONDD format dates", () => {
    const date = extractEventDate("KXNFLGAME-24SEP04DALPHI-DAL");

    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(8); // September (0-indexed)
    expect(date?.getDate()).toBe(4);
  });

  it("should extract YYMON format dates", () => {
    const date = extractEventDate("KXCPI-24SEP");

    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(8); // September
    expect(date?.getDate()).toBe(1); // Defaults to 1st
  });

  it("should extract dates with different months", () => {
    expect(extractEventDate("25JAN15")?.getMonth()).toBe(0); // January
    expect(extractEventDate("25FEB15")?.getMonth()).toBe(1); // February
    expect(extractEventDate("25MAR15")?.getMonth()).toBe(2); // March
    expect(extractEventDate("25APR15")?.getMonth()).toBe(3); // April
    expect(extractEventDate("25MAY15")?.getMonth()).toBe(4); // May
    expect(extractEventDate("25JUN15")?.getMonth()).toBe(5); // June
    expect(extractEventDate("25JUL15")?.getMonth()).toBe(6); // July
    expect(extractEventDate("25AUG15")?.getMonth()).toBe(7); // August
    expect(extractEventDate("25SEP15")?.getMonth()).toBe(8); // September
    expect(extractEventDate("25OCT15")?.getMonth()).toBe(9); // October
    expect(extractEventDate("25NOV15")?.getMonth()).toBe(10); // November
    expect(extractEventDate("25DEC15")?.getMonth()).toBe(11); // December
  });

  it("should return null for symbols without dates", () => {
    expect(extractEventDate("KXTEST")).toBeNull();
    expect(extractEventDate("UNKNOWN")).toBeNull();
  });
});

describe("formatEventDate", () => {
  it("should format date to ISO string", () => {
    const date = new Date(2024, 8, 4); // September 4, 2024

    expect(formatEventDate(date)).toBe("2024-09-04");
  });

  it("should pad single-digit months and days", () => {
    const date = new Date(2024, 0, 5); // January 5, 2024

    expect(formatEventDate(date)).toBe("2024-01-05");
  });
});

describe("extractExchange", () => {
  it("should extract prefix from symbol", () => {
    // extractExchange extracts the first 2-4 uppercase letters
    expect(extractExchange("KXNFLGAME")).toBe("KXNF");
  });

  it("should extract other prefixes", () => {
    expect(extractExchange("ABCD")).toBe("ABCD");
    expect(extractExchange("XY")).toBe("XY");
  });

  it("should return null for empty string", () => {
    expect(extractExchange("")).toBeNull();
  });
});

describe("extractEventType", () => {
  it("should extract event type from symbol", () => {
    // extractEventType removes the exchange prefix and extracts uppercase letters before dash
    const result = extractEventType("KXNFLGAME-24SEP04");
    expect(result).toBeTruthy();
    // The exact extraction depends on implementation details
    expect(typeof result).toBe("string");
  });

  it("should extract Fed rate type", () => {
    const result = extractEventType("KXFEDRATE-24SEP18");
    expect(result).toBeTruthy();
  });

  it("should extract type from simple symbol", () => {
    const result = extractEventType("KXCPI-24SEP");
    expect(result).toBeTruthy();
  });
});

describe("extractParticipants", () => {
  it("should extract team from outcome", () => {
    const result = extractParticipants("KXNFLGAME-24SEP04DALPHI-DAL");

    expect(result).toContain("DAL");
  });

  it("should handle symbols with matchup codes", () => {
    const result = extractParticipants("KXNFLGAME-24SEP04-DALPHI-PHI");

    expect(result.length).toBeGreaterThan(0);
  });

  it("should handle symbols without clear participants", () => {
    const result = extractParticipants("KXCPI-24SEP");
    // The function extracts parts after dash separators
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("getSubcategory", () => {
  it("should return subcategory for NFL", () => {
    const result = getSubcategory("KXNFLGAME-24SEP04");

    expect(result).not.toBeNull();
    expect(["Game", "Player Props", "Season"]).toContain(result);
  });

  it("should return subcategory for Economics", () => {
    const result = getSubcategory("KXFEDRATE-24SEP18");

    expect(result).toBe("Fed Decision");
  });

  it("should return null for Other category", () => {
    const result = getSubcategory("UNKNOWN");

    expect(result).toBeNull();
  });
});

describe("parseSymbol", () => {
  it("should parse complete symbol structure", () => {
    const result = parseSymbol("KXNFLGAME-24SEP04DALPHI-DAL");

    expect(result.raw).toBe("KXNFLGAME-24SEP04DALPHI-DAL");
    expect(result.category).toBe("NFL");
    // Exchange extraction gets first 2-4 uppercase letters
    expect(result.exchange).toBeTruthy();
    expect(result.eventDate).toBe("2024-09-04");
  });

  it("should parse economics symbol", () => {
    const result = parseSymbol("KXFEDRATE-24SEP18-25BPCUT");

    expect(result.category).toBe("Economics");
    expect(result.exchange).toBeTruthy();
    expect(result.eventDate).toBe("2024-09-18");
  });

  it("should handle symbols without dates", () => {
    const result = parseSymbol("KXTEST");

    expect(result.category).toBe("Other");
    expect(result.eventDate).toBeUndefined();
  });
});

describe("getBaseSymbol", () => {
  it("should remove outcome from symbol", () => {
    const result = getBaseSymbol("KXNFLGAME-24SEP04DALPHI-DAL");

    expect(result).toBe("KXNFLGAME-24SEP04DALPHI");
  });

  it("should return unchanged symbol with only one part", () => {
    const result = getBaseSymbol("KXTEST");

    expect(result).toBe("KXTEST");
  });

  it("should return unchanged symbol with two parts", () => {
    const result = getBaseSymbol("KXTEST-24SEP");

    expect(result).toBe("KXTEST-24SEP");
  });
});

describe("isSameEvent", () => {
  it("should return true for same event different outcomes", () => {
    const result = isSameEvent(
      "KXNFLGAME-24SEP04DALPHI-DAL",
      "KXNFLGAME-24SEP04DALPHI-PHI"
    );

    expect(result).toBe(true);
  });

  it("should return false for different events", () => {
    const result = isSameEvent(
      "KXNFLGAME-24SEP04DALPHI-DAL",
      "KXNFLGAME-24SEP08SFOAK-SF"
    );

    expect(result).toBe(false);
  });
});

describe("getOutcome", () => {
  it("should extract outcome from symbol", () => {
    expect(getOutcome("KXNFLGAME-24SEP04DALPHI-DAL")).toBe("DAL");
    expect(getOutcome("KXNFLGAME-24SEP04DALPHI-PHI")).toBe("PHI");
  });

  it("should return null for symbol without outcome", () => {
    expect(getOutcome("KXTEST")).toBeNull();
  });
});

describe("isBinaryMarket", () => {
  it("should return true for standard binary markets", () => {
    expect(isBinaryMarket("KXNFLGAME-24SEP04DALPHI-DAL")).toBe(true);
    expect(isBinaryMarket("KXFEDRATE-24SEP18-25BPCUT")).toBe(true);
  });

  it("should return false for range markets", () => {
    expect(isBinaryMarket("KXRANGE-24SEP")).toBe(false);
  });

  it("should return false for multi-outcome markets", () => {
    expect(isBinaryMarket("KXMULTI-24SEP")).toBe(false);
  });
});

describe("getEventDescription", () => {
  it("should generate description for NFL game", () => {
    const result = getEventDescription("KXNFLGAME-24SEP04DALPHI-DAL");

    expect(result).toContain("NFL");
  });

  it("should generate description for economics event", () => {
    const result = getEventDescription("KXFEDRATE-24SEP18-25BPCUT");

    expect(result).toContain("Economics");
    expect(result).toContain("2024-09-18");
  });

  it("should return a description for unknown format", () => {
    const result = getEventDescription("UNKNOWN");
    // The function tries to generate a description from parsed components
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("groupByCategory", () => {
  it("should group symbols by category", () => {
    const symbols = [
      "KXNFLGAME-24SEP04",
      "KXNFLGAME-24SEP08",
      "KXFEDRATE-24SEP18",
      "KXNBAGAME-24OCT15",
    ];

    const result = groupByCategory(symbols);

    expect(result.get("NFL")).toHaveLength(2);
    expect(result.get("Economics")).toHaveLength(1);
    expect(result.get("NBA")).toHaveLength(1);
  });

  it("should group unknown symbols as Other", () => {
    const symbols = ["UNKNOWN1", "UNKNOWN2"];

    const result = groupByCategory(symbols);

    expect(result.get("Other")).toHaveLength(2);
  });

  it("should return empty map for empty array", () => {
    const result = groupByCategory([]);

    expect(result.size).toBe(0);
  });
});

describe("getCategoryStats", () => {
  it("should calculate category statistics", () => {
    const symbols = [
      "KXNFLGAME-24SEP04",
      "KXNFLGAME-24SEP08",
      "KXFEDRATE-24SEP18",
      "KXNBAGAME-24OCT15",
    ];

    const result = getCategoryStats(symbols);

    const nflStat = result.find(s => s.category === "NFL");
    expect(nflStat?.count).toBe(2);
    expect(nflStat?.percentage).toBe(50);

    const econStat = result.find(s => s.category === "Economics");
    expect(econStat?.count).toBe(1);
    expect(econStat?.percentage).toBe(25);
  });

  it("should sort by count descending", () => {
    const symbols = [
      "KXNFLGAME-24SEP04",
      "KXNFLGAME-24SEP08",
      "KXNFLGAME-24SEP12",
      "KXFEDRATE-24SEP18",
    ];

    const result = getCategoryStats(symbols);

    expect(result[0].category).toBe("NFL");
    expect(result[0].count).toBe(3);
  });

  it("should return empty array for empty input", () => {
    const result = getCategoryStats([]);

    expect(result).toEqual([]);
  });

  it("should handle single category", () => {
    const symbols = [
      "KXNFLGAME-24SEP04",
      "KXNFLGAME-24SEP08",
    ];

    const result = getCategoryStats(symbols);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("NFL");
    expect(result[0].percentage).toBe(100);
  });
});
