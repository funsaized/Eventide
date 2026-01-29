/**
 * Version Detector
 *
 * Detects statement format version based on statement date and document characteristics.
 * Robinhood Derivatives statements have evolved over time with format changes.
 */

import type { ExtractedDocument, TextItem } from "./types";
import { flattenDocument } from "./pdf-loader";
import { extractStatementDate, detectSections } from "./utils";

/**
 * Known statement format versions with their effective dates
 */
export const STATEMENT_FORMAT_VERSIONS = {
  "2024-01-01": "v1.0", // Initial Robinhood Derivatives format
  "2024-06-01": "v1.1", // Added Section 11 (Tax Withholding)
} as const;

export type StatementVersion = (typeof STATEMENT_FORMAT_VERSIONS)[keyof typeof STATEMENT_FORMAT_VERSIONS];

/**
 * Version detection result
 */
export interface VersionDetectionResult {
  /** Detected version */
  version: StatementVersion;
  /** Confidence level (0-1) */
  confidence: number;
  /** Statement date used for detection */
  statementDate: string | null;
  /** Detection method used */
  method: "date" | "structure" | "heuristic" | "fallback";
  /** Additional detection notes */
  notes?: string;
}

/**
 * Version-specific characteristics for structural detection
 */
interface VersionCharacteristics {
  /** Expected section count range */
  sectionCount: [number, number];
  /** Required section patterns (regex) */
  requiredPatterns: RegExp[];
  /** Optional section patterns */
  optionalPatterns: RegExp[];
  /** Distinguishing text patterns */
  distinguishingText: RegExp[];
}

const VERSION_CHARACTERISTICS: Record<StatementVersion, VersionCharacteristics> = {
  "v1.0": {
    sectionCount: [6, 10],
    requiredPatterns: [
      /Monthly\s+Trade\s+Confirmations?/i,
      /Account\s+Activity/i,
      /Purchase\s+and\s+Sale/i,
    ],
    optionalPatterns: [
      /Journal\s+Entries/i,
      /Open\s+Positions?/i,
    ],
    distinguishingText: [
      /Robinhood\s+Derivatives/i,
    ],
  },
  "v1.1": {
    sectionCount: [7, 12],
    requiredPatterns: [
      /Monthly\s+Trade\s+Confirmations?/i,
      /Account\s+Activity/i,
      /Purchase\s+and\s+Sale/i,
    ],
    optionalPatterns: [
      /Journal\s+Entries/i,
      /Open\s+Positions?/i,
      /Tax\s+Withholding/i, // New in v1.1
    ],
    distinguishingText: [
      /Robinhood\s+Derivatives/i,
      /Tax\s+Withholding/i, // Distinguishing feature of v1.1
    ],
  },
};

/**
 * Parse a date string to Date object
 */
function parseStatementDateToDate(dateStr: string): Date | null {
  // Try ISO format (YYYY-MM-DD)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try MM/DD/YYYY format
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  return null;
}

/**
 * Get version by date using version cutoff dates
 */
function getVersionByDate(dateStr: string): StatementVersion | null {
  const date = parseStatementDateToDate(dateStr);
  if (!date) return null;

  // Sort version dates in descending order
  const sortedDates = Object.keys(STATEMENT_FORMAT_VERSIONS).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // Find the first version date that is <= statement date
  for (const versionDate of sortedDates) {
    if (date >= new Date(versionDate)) {
      return STATEMENT_FORMAT_VERSIONS[versionDate as keyof typeof STATEMENT_FORMAT_VERSIONS];
    }
  }

  // Default to earliest version if before all known dates
  return "v1.0";
}

/**
 * Detect version by analyzing document structure
 */
function detectVersionByStructure(
  document: ExtractedDocument
): { version: StatementVersion; confidence: number } | null {
  const allItems = flattenDocument(document);
  const fullText = allItems.map((item) => item.text).join(" ");
  const sections = detectSections(document);

  let bestMatch: { version: StatementVersion; score: number } | null = null;

  for (const [version, characteristics] of Object.entries(VERSION_CHARACTERISTICS)) {
    let score = 0;
    const maxScore = 100;

    // Check section count (20 points)
    const sectionCount = sections.length;
    if (
      sectionCount >= characteristics.sectionCount[0] &&
      sectionCount <= characteristics.sectionCount[1]
    ) {
      score += 20;
    }

    // Check required patterns (40 points total)
    const requiredFound = characteristics.requiredPatterns.filter((pattern) =>
      pattern.test(fullText)
    ).length;
    score += (requiredFound / characteristics.requiredPatterns.length) * 40;

    // Check distinguishing text (40 points)
    const distinguishingFound = characteristics.distinguishingText.filter(
      (pattern) => pattern.test(fullText)
    ).length;
    score += (distinguishingFound / characteristics.distinguishingText.length) * 40;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { version: version as StatementVersion, score };
    }
  }

  if (bestMatch && bestMatch.score >= 50) {
    return {
      version: bestMatch.version,
      confidence: bestMatch.score / 100,
    };
  }

  return null;
}

/**
 * Check if document appears to be a Robinhood Derivatives statement
 */
export function isRobinhoodDerivativesStatement(document: ExtractedDocument): boolean {
  const allItems = flattenDocument(document);
  const fullText = allItems.map((item) => item.text).join(" ");

  // Must contain "Robinhood" and "Derivatives" or similar identifiers
  const hasRobinhood = /Robinhood/i.test(fullText);
  const hasDerivatives = /Derivatives|Event\s+Contracts?|Prediction\s+Markets?/i.test(fullText);
  const hasStatementIndicator = /Statement|Account\s+Activity|Trade\s+Confirmations?/i.test(fullText);

  return hasRobinhood && (hasDerivatives || hasStatementIndicator);
}

/**
 * Detect statement format version
 */
export function detectVersion(document: ExtractedDocument): VersionDetectionResult {
  const allItems = flattenDocument(document);

  // First, check if this is even a Robinhood statement
  if (!isRobinhoodDerivativesStatement(document)) {
    return {
      version: "v1.0",
      confidence: 0,
      statementDate: null,
      method: "fallback",
      notes: "Document does not appear to be a Robinhood Derivatives statement",
    };
  }

  // Try date-based detection (highest confidence)
  const statementDate = extractStatementDate(allItems);
  if (statementDate) {
    const versionByDate = getVersionByDate(statementDate);
    if (versionByDate) {
      return {
        version: versionByDate,
        confidence: 0.95,
        statementDate,
        method: "date",
        notes: `Detected from statement date: ${statementDate}`,
      };
    }
  }

  // Try structure-based detection (moderate confidence)
  const structureResult = detectVersionByStructure(document);
  if (structureResult) {
    return {
      version: structureResult.version,
      confidence: structureResult.confidence * 0.8, // Reduce confidence for structure-based
      statementDate,
      method: "structure",
      notes: "Detected from document structure analysis",
    };
  }

  // Heuristic fallback: check for v1.1-specific features
  const fullText = allItems.map((item) => item.text).join(" ");
  if (/Tax\s+Withholding/i.test(fullText)) {
    return {
      version: "v1.1",
      confidence: 0.6,
      statementDate,
      method: "heuristic",
      notes: "Detected Tax Withholding section (v1.1 feature)",
    };
  }

  // Default fallback
  return {
    version: "v1.0",
    confidence: 0.5,
    statementDate,
    method: "fallback",
    notes: "Using default version due to insufficient detection signals",
  };
}

/**
 * Get all supported versions
 */
export function getSupportedVersions(): StatementVersion[] {
  return Object.values(STATEMENT_FORMAT_VERSIONS);
}

/**
 * Get version effective date
 */
export function getVersionEffectiveDate(version: StatementVersion): string | null {
  for (const [date, v] of Object.entries(STATEMENT_FORMAT_VERSIONS)) {
    if (v === version) {
      return date;
    }
  }
  return null;
}

/**
 * Check if a version is supported
 */
export function isVersionSupported(version: string): version is StatementVersion {
  return getSupportedVersions().includes(version as StatementVersion);
}
