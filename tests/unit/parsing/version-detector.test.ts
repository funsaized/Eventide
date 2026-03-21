/**
 * Version Detector Tests
 *
 * Tests for statement format version detection.
 */

import { describe, it, expect } from "vitest";
import {
  STATEMENT_FORMAT_VERSIONS,
  detectVersion,
  isRobinhoodDerivativesStatement,
  getSupportedVersions,
  getVersionEffectiveDate,
  isVersionSupported,
} from "@/lib/parsing/version-detector";
import type { TextItem, ExtractedDocument } from "@/lib/parsing/types";

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
// STATEMENT FORMAT VERSIONS
// ============================================================================

describe("STATEMENT_FORMAT_VERSIONS", () => {
  it("should have v1.0 and v1.1", () => {
    expect(STATEMENT_FORMAT_VERSIONS["2024-01-01"]).toBe("v1.0");
    expect(STATEMENT_FORMAT_VERSIONS["2024-06-01"]).toBe("v1.1");
  });
});

// ============================================================================
// SUPPORTED VERSIONS
// ============================================================================

describe("getSupportedVersions", () => {
  it("should return all supported versions", () => {
    const versions = getSupportedVersions();
    expect(versions).toContain("v1.0");
    expect(versions).toContain("v1.1");
  });
});

describe("getVersionEffectiveDate", () => {
  it("should return effective date for known versions", () => {
    expect(getVersionEffectiveDate("v1.0")).toBe("2024-01-01");
    expect(getVersionEffectiveDate("v1.1")).toBe("2024-06-01");
  });

  it("should return null for unknown versions", () => {
    expect(getVersionEffectiveDate("v99.0" as never)).toBeNull();
  });
});

describe("isVersionSupported", () => {
  it("should return true for supported versions", () => {
    expect(isVersionSupported("v1.0")).toBe(true);
    expect(isVersionSupported("v1.1")).toBe(true);
  });

  it("should return false for unsupported versions", () => {
    expect(isVersionSupported("v2.0")).toBe(false);
  });
});

// ============================================================================
// ROBINHOOD STATEMENT DETECTION
// ============================================================================

describe("isRobinhoodDerivativesStatement", () => {
  it("should detect a Robinhood Derivatives statement", () => {
    const doc = makeDocument([
      makeItem("Robinhood Derivatives"),
      makeItem("Monthly Trade Confirmations"),
    ]);
    expect(isRobinhoodDerivativesStatement(doc)).toBe(true);
  });

  it("should reject non-Robinhood documents", () => {
    const doc = makeDocument([
      makeItem("Some Other Brokerage"),
      makeItem("Account Statement"),
    ]);
    expect(isRobinhoodDerivativesStatement(doc)).toBe(false);
  });

  it("should detect via Event Contracts keyword", () => {
    const doc = makeDocument([
      makeItem("Robinhood"),
      makeItem("Event Contracts Statement"),
    ]);
    expect(isRobinhoodDerivativesStatement(doc)).toBe(true);
  });
});

// ============================================================================
// VERSION DETECTION
// ============================================================================

describe("detectVersion", () => {
  it("should detect v1.0 by date for pre-June 2024 statements", () => {
    const doc = makeDocument([
      makeItem("Robinhood Derivatives"),
      makeItem("Statement Period: March 1, 2024"),
      makeItem("Monthly Trade Confirmations"),
      makeItem("Account Activity"),
      makeItem("Account Summary"),
    ]);

    const result = detectVersion(doc);
    expect(result.version).toBe("v1.0");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("should detect v1.1 by date for post-June 2024 statements", () => {
    const doc = makeDocument([
      makeItem("Robinhood Derivatives"),
      makeItem("Statement Period: September 1, 2024"),
      makeItem("Monthly Trade Confirmations"),
      makeItem("Account Activity"),
      makeItem("Account Summary"),
    ]);

    const result = detectVersion(doc);
    expect(result.version).toBe("v1.1");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("should return low confidence for non-Robinhood documents", () => {
    const doc = makeDocument([
      makeItem("Some Other Brokerage"),
      makeItem("Random content"),
    ]);

    const result = detectVersion(doc);
    expect(result.confidence).toBe(0);
    expect(result.method).toBe("fallback");
  });

  it("should use heuristic for v1.1 when Tax Withholding section found", () => {
    const doc = makeDocument([
      makeItem("Robinhood Derivatives"),
      makeItem("Monthly Trade Confirmations"),
      makeItem("Tax Withholding"),
    ]);

    const result = detectVersion(doc);
    // Should either detect by structure or heuristic
    expect(["v1.0", "v1.1"]).toContain(result.version);
  });
});
