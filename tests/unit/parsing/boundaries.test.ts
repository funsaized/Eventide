/**
 * Section Boundary Detection Tests
 *
 * Tests for detecting section boundaries in PDF documents.
 */

import { describe, it, expect } from "vitest";
import {
  SECTION_DEFINITIONS,
  matchesSectionHeader,
  detectSectionBoundaries,
  getSection,
  hasSection,
  validateRequiredSections,
  isWithinSection,
  isMultiPageSection,
  getSectionPages,
  type SectionBoundary,
} from "@/lib/parsing/robinhood/sections/boundaries";
import type { TextItem, ExtractedDocument } from "@/lib/parsing/robinhood/types";

// ============================================================================
// HELPERS
// ============================================================================

function makeItem(text: string, page = 1, x = 0, y = 0): TextItem {
  return { text, x, y, width: text.length * 5, height: 10, pageNumber: page };
}

function makeDocument(items: TextItem[]): ExtractedDocument {
  const pageMap = new Map<number, TextItem[]>();
  for (const item of items) {
    const existing = pageMap.get(item.pageNumber) ?? [];
    existing.push(item);
    pageMap.set(item.pageNumber, existing);
  }
  return {
    pageCount: pageMap.size,
    pages: Array.from(pageMap.entries()).map(([pageNumber, pageItems]) => ({
      pageNumber,
      width: 612,
      height: 792,
      items: pageItems,
    })),
  };
}

// ============================================================================
// SECTION DEFINITIONS
// ============================================================================

describe("SECTION_DEFINITIONS", () => {
  it("should define all 10 sections", () => {
    expect(SECTION_DEFINITIONS).toHaveLength(10);
  });

  it("should have required sections: 1, 2, 4, 5, 6, 10", () => {
    const required = SECTION_DEFINITIONS.filter((s) => s.required);
    const requiredIds = required.map((s) => s.id);
    expect(requiredIds).toContain("section1");
    expect(requiredIds).toContain("section2");
    expect(requiredIds).toContain("section4");
    expect(requiredIds).toContain("section5");
    expect(requiredIds).toContain("section6");
    expect(requiredIds).toContain("section10");
  });
});

// ============================================================================
// HEADER MATCHING
// ============================================================================

describe("matchesSectionHeader", () => {
  it("should match section 1 header", () => {
    expect(matchesSectionHeader("Robinhood Derivatives")?.id).toBe("section1");
  });

  it("should match section 2 header", () => {
    expect(matchesSectionHeader("Monthly Trade Confirmations")?.id).toBe(
      "section2"
    );
  });

  it("should match section 4 but NOT section 5", () => {
    expect(matchesSectionHeader("Purchase and Sale")?.id).toBe("section4");
    expect(matchesSectionHeader("Purchase and Sale Summary")?.id).toBe(
      "section5"
    );
  });

  it("should match section 7 but NOT section 8", () => {
    expect(matchesSectionHeader("Open Positions")?.id).toBe("section7");
    expect(matchesSectionHeader("Open Position Summary")?.id).toBe("section8");
  });

  it("should match section 10", () => {
    expect(matchesSectionHeader("Account Summary")?.id).toBe("section10");
  });

  it("should return null for unrecognized text", () => {
    expect(matchesSectionHeader("Random text")).toBeNull();
  });
});

// ============================================================================
// BOUNDARY DETECTION
// ============================================================================

describe("detectSectionBoundaries", () => {
  it("should detect sections in a simple document", () => {
    const doc = makeDocument([
      makeItem("Robinhood Derivatives", 1),
      makeItem("Account: 12345", 1),
      makeItem("Monthly Trade Confirmations", 2),
      makeItem("Date Symbol Qty", 2),
      makeItem("2024-01-01 KX 10", 2),
      makeItem("Account Summary", 3),
      makeItem("Net Liquidity: $1000", 3),
    ]);

    const result = detectSectionBoundaries(doc);
    expect(result.sections.length).toBeGreaterThanOrEqual(3);
    expect(result.presentSections).toContain("section1");
    expect(result.presentSections).toContain("section2");
    expect(result.presentSections).toContain("section10");
  });

  it("should report missing required sections", () => {
    const doc = makeDocument([
      makeItem("Robinhood Derivatives", 1),
      makeItem("Account Summary", 2),
    ]);

    const result = detectSectionBoundaries(doc);
    expect(result.isComplete).toBe(false);
    expect(result.missingSections.length).toBeGreaterThan(0);
  });

  it("should assign items to sections", () => {
    const doc = makeDocument([
      makeItem("Robinhood Derivatives", 1),
      makeItem("Info line 1", 1),
      makeItem("Account Summary", 2),
      makeItem("Net Liquidity: $1000", 2),
    ]);

    const result = detectSectionBoundaries(doc);
    const section1 = getSection(result, "section1");
    const section10 = getSection(result, "section10");

    expect(section1).not.toBeNull();
    expect(section1!.items.length).toBeGreaterThanOrEqual(1);
    expect(section10).not.toBeNull();
    expect(section10!.items.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// SECTION QUERIES
// ============================================================================

describe("getSection", () => {
  it("should return the section by ID", () => {
    const doc = makeDocument([
      makeItem("Robinhood Derivatives", 1),
      makeItem("Account Summary", 2),
    ]);
    const result = detectSectionBoundaries(doc);

    expect(getSection(result, "section1")).not.toBeNull();
    expect(getSection(result, "section10")).not.toBeNull();
    expect(getSection(result, "section7")).toBeNull();
  });
});

describe("hasSection", () => {
  it("should return true for present sections", () => {
    const doc = makeDocument([
      makeItem("Robinhood Derivatives", 1),
      makeItem("Account Summary", 2),
    ]);
    const result = detectSectionBoundaries(doc);

    expect(hasSection(result, "section1")).toBe(true);
    expect(hasSection(result, "section10")).toBe(true);
    expect(hasSection(result, "section7")).toBe(false);
  });
});

describe("validateRequiredSections", () => {
  it("should report errors for missing required sections", () => {
    const doc = makeDocument([makeItem("Robinhood Derivatives", 1)]);
    const result = detectSectionBoundaries(doc);
    const validation = validateRequiredSections(result);

    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// SECTION UTILITIES
// ============================================================================

describe("isWithinSection", () => {
  it("should return true for items within the section range", () => {
    const boundary: SectionBoundary = {
      id: "section2",
      name: "Monthly Trade Confirmations",
      startIndex: 5,
      endIndex: 15,
      startPage: 1,
      endPage: 2,
      headerItem: makeItem("Monthly Trade Confirmations"),
      items: [],
    };

    expect(isWithinSection(5, boundary)).toBe(true);
    expect(isWithinSection(10, boundary)).toBe(true);
    expect(isWithinSection(14, boundary)).toBe(true);
    expect(isWithinSection(15, boundary)).toBe(false);
    expect(isWithinSection(4, boundary)).toBe(false);
  });
});

describe("isMultiPageSection", () => {
  it("should detect multi-page sections", () => {
    const single: SectionBoundary = {
      id: "section1",
      name: "test",
      startIndex: 0,
      endIndex: 10,
      startPage: 1,
      endPage: 1,
      headerItem: makeItem("test"),
      items: [],
    };
    const multi: SectionBoundary = {
      ...single,
      endPage: 3,
    };

    expect(isMultiPageSection(single)).toBe(false);
    expect(isMultiPageSection(multi)).toBe(true);
  });
});

describe("getSectionPages", () => {
  it("should return all pages a section spans", () => {
    const boundary: SectionBoundary = {
      id: "section2",
      name: "test",
      startIndex: 0,
      endIndex: 100,
      startPage: 2,
      endPage: 4,
      headerItem: makeItem("test"),
      items: [],
    };

    expect(getSectionPages(boundary)).toEqual([2, 3, 4]);
  });

  it("should return single page for non-spanning sections", () => {
    const boundary: SectionBoundary = {
      id: "section2",
      name: "test",
      startIndex: 0,
      endIndex: 10,
      startPage: 1,
      endPage: 1,
      headerItem: makeItem("test"),
      items: [],
    };

    expect(getSectionPages(boundary)).toEqual([1]);
  });
});
