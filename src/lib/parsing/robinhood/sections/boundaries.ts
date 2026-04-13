/**
 * Section Boundary Detection
 *
 * Detects section boundaries in Robinhood Derivatives monthly statements.
 * Handles all 10 sections defined in the statement format.
 */

import type { TextItem, ExtractedDocument } from "../../types";
import { flattenDocument } from "../pdf-loader";

// ============================================================================
// SECTION DEFINITIONS
// ============================================================================

/**
 * Section identifiers matching the spec
 */
export type SectionId =
  | "section1"   // Statement header (no explicit header)
  | "section2"   // Monthly Trade Confirmations
  | "section3"   // Trade Confirmation Summary
  | "section4"   // Purchase and Sale
  | "section5"   // Purchase and Sale Summary
  | "section6"   // Journal Entries
  | "section7"   // Open Positions
  | "section8"   // Open Position Summary
  | "section9"   // Margin Calls
  | "section10"; // Account Summary

/**
 * Section definition with header pattern and metadata
 */
interface SectionDefinition {
  id: SectionId;
  /** Regex pattern to match section header */
  pattern: RegExp;
  /** Human-readable name */
  name: string;
  /** Whether this section is required for a valid statement */
  required: boolean;
  /** Expected order in document (lower = earlier) */
  order: number;
}

/**
 * All section definitions ordered by expected appearance in document
 */
export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    id: "section1",
    pattern: /^Robinhood\s+Derivatives/i,
    name: "Statement Header",
    required: true,
    order: 1,
  },
  {
    id: "section2",
    pattern: /Monthly\s+Trade\s+Confirmations?/i,
    name: "Monthly Trade Confirmations",
    required: true,
    order: 2,
  },
  {
    id: "section3",
    pattern: /Trade\s+Confirmation\s+Summary/i,
    name: "Trade Confirmation Summary",
    required: false,
    order: 3,
  },
  {
    id: "section4",
    // Match "Purchase and Sale" but NOT "Purchase and Sale Summary"
    pattern: /Purchase\s+and\s+Sale(?!\s+Summary)/i,
    name: "Purchase and Sale",
    required: true,
    order: 4,
  },
  {
    id: "section5",
    pattern: /Purchase\s+and\s+Sale\s+Summary/i,
    name: "Purchase and Sale Summary",
    required: true,
    order: 5,
  },
  {
    id: "section6",
    pattern: /Journal\s+Entries/i,
    name: "Journal Entries",
    required: true,
    order: 6,
  },
  {
    id: "section7",
    // Match "Open Positions" but NOT "Open Position Summary"
    pattern: /Open\s+Positions?(?!\s+Summary)/i,
    name: "Open Positions",
    required: false,
    order: 7,
  },
  {
    id: "section8",
    pattern: /Open\s+Position\s+Summary/i,
    name: "Open Position Summary",
    required: false,
    order: 8,
  },
  {
    id: "section9",
    pattern: /Margin\s+Calls?/i,
    name: "Margin Calls",
    required: false,
    order: 9,
  },
  {
    id: "section10",
    pattern: /Account\s+Summary/i,
    name: "Account Summary",
    required: true,
    order: 10,
  },
];

// ============================================================================
// SECTION BOUNDARY TYPES
// ============================================================================

/**
 * A detected section boundary in the document
 */
export interface SectionBoundary {
  /** Section identifier */
  id: SectionId;
  /** Section name */
  name: string;
  /** Index in flattened TextItem array where section header starts */
  startIndex: number;
  /** Index where section ends (exclusive, null if extends to end) */
  endIndex: number | null;
  /** Page number where section starts */
  startPage: number;
  /** Page number where section ends */
  endPage: number | null;
  /** The header text item that triggered detection */
  headerItem: TextItem;
  /** All text items in this section (populated after boundary finalization) */
  items: TextItem[];
}

/**
 * Result of section boundary detection
 */
export interface BoundaryDetectionResult {
  /** All detected sections */
  sections: SectionBoundary[];
  /** Sections that are present */
  presentSections: SectionId[];
  /** Required sections that are missing */
  missingSections: SectionId[];
  /** Whether all required sections are present */
  isComplete: boolean;
  /** Detection warnings */
  warnings: string[];
}

// ============================================================================
// DETECTION LOGIC
// ============================================================================

/**
 * Check if text matches any section header
 */
export function matchesSectionHeader(text: string): SectionDefinition | null {
  for (const section of SECTION_DEFINITIONS) {
    if (section.pattern.test(text)) {
      return section;
    }
  }
  return null;
}

/**
 * Combine adjacent text items on the same line into a single string
 * Used because section headers may be split across multiple text items
 */
function combineLineText(items: TextItem[], startIndex: number, yTolerance: number = 3): string {
  if (startIndex >= items.length) return "";

  const startItem = items[startIndex];
  const lineItems: TextItem[] = [startItem];

  // Look ahead for items on the same line (within y tolerance)
  for (let i = startIndex + 1; i < items.length && i < startIndex + 10; i++) {
    const item = items[i];
    // Must be on same page and similar Y position
    if (item.pageNumber !== startItem.pageNumber) break;
    if (Math.abs(item.y - startItem.y) > yTolerance) break;
    lineItems.push(item);
  }

  // Sort by X position and combine
  lineItems.sort((a, b) => a.x - b.x);
  return lineItems.map(item => item.text).join(" ");
}

/**
 * Detect all section boundaries in a document
 */
export function detectSectionBoundaries(
  document: ExtractedDocument
): BoundaryDetectionResult {
  const allItems = flattenDocument(document);
  const boundaries: SectionBoundary[] = [];
  const warnings: string[] = [];

  // Track detected sections for uniqueness
  const detectedIds = new Set<SectionId>();

  // Scan through all text items looking for section headers
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];

    // First try matching single item text
    let matchedSection = matchesSectionHeader(item.text);

    // If no match, try combining with adjacent items on the same line
    // This handles cases where headers like "Monthly Trade Confirmations"
    // are split across multiple text items
    if (!matchedSection) {
      const combinedText = combineLineText(allItems, i);
      matchedSection = matchesSectionHeader(combinedText);
    }

    if (matchedSection) {
      // Check for duplicate section (some sections may repeat on page breaks)
      if (detectedIds.has(matchedSection.id)) {
        // Check if this is a repeated header (same page or immediately after)
        const existingBoundary = boundaries.find(b => b.id === matchedSection.id);
        if (existingBoundary) {
          // If this is within a few pages, it's likely a repeated header
          if (item.pageNumber - existingBoundary.startPage <= 3) {
            continue; // Skip repeated header
          } else {
            warnings.push(
              `Duplicate section ${matchedSection.name} found at different locations`
            );
          }
        }
      }

      // Close the previous section
      if (boundaries.length > 0) {
        const prevBoundary = boundaries[boundaries.length - 1];
        prevBoundary.endIndex = i;
        prevBoundary.endPage = i > 0 ? allItems[i - 1].pageNumber : prevBoundary.startPage;
        prevBoundary.items = allItems.slice(prevBoundary.startIndex, i);
      }

      // Create new boundary
      boundaries.push({
        id: matchedSection.id,
        name: matchedSection.name,
        startIndex: i,
        endIndex: null,
        startPage: item.pageNumber,
        endPage: null,
        headerItem: item,
        items: [], // Will be populated when section is closed
      });

      detectedIds.add(matchedSection.id);
    }
  }

  // Close the last section
  if (boundaries.length > 0) {
    const lastBoundary = boundaries[boundaries.length - 1];
    lastBoundary.endIndex = allItems.length;
    lastBoundary.endPage = allItems.length > 0
      ? allItems[allItems.length - 1].pageNumber
      : lastBoundary.startPage;
    lastBoundary.items = allItems.slice(lastBoundary.startIndex);
  }

  // Check for required sections
  const presentSections = Array.from(detectedIds);
  const requiredSections = SECTION_DEFINITIONS
    .filter(s => s.required)
    .map(s => s.id);
  const missingSections = requiredSections.filter(
    id => !detectedIds.has(id)
  );

  if (missingSections.length > 0) {
    const missingNames = missingSections.map(id => {
      const def = SECTION_DEFINITIONS.find(d => d.id === id);
      return def?.name ?? id;
    });
    warnings.push(`Missing required sections: ${missingNames.join(", ")}`);
  }

  return {
    sections: boundaries,
    presentSections,
    missingSections,
    isComplete: missingSections.length === 0,
    warnings,
  };
}

/**
 * Get a specific section by ID
 */
export function getSection(
  result: BoundaryDetectionResult,
  sectionId: SectionId
): SectionBoundary | null {
  return result.sections.find(s => s.id === sectionId) ?? null;
}

/**
 * Get section items for a specific section
 */
export function getSectionItems(
  document: ExtractedDocument,
  sectionId: SectionId
): TextItem[] | null {
  const result = detectSectionBoundaries(document);
  const section = getSection(result, sectionId);
  return section?.items ?? null;
}

/**
 * Check if a section is present in the document
 */
export function hasSection(
  result: BoundaryDetectionResult,
  sectionId: SectionId
): boolean {
  return result.presentSections.includes(sectionId);
}

/**
 * Validate that all required sections are present
 */
export function validateRequiredSections(
  result: BoundaryDetectionResult
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const section of SECTION_DEFINITIONS) {
    if (section.required && !hasSection(result, section.id)) {
      errors.push(`Missing required section: ${section.name}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SECTION SPANNING UTILITIES
// ============================================================================

/**
 * Check if a text item is within a section boundary
 */
export function isWithinSection(
  itemIndex: number,
  boundary: SectionBoundary
): boolean {
  const end = boundary.endIndex ?? Infinity;
  return itemIndex >= boundary.startIndex && itemIndex < end;
}

/**
 * Check if section spans multiple pages
 */
export function isMultiPageSection(boundary: SectionBoundary): boolean {
  if (boundary.endPage === null) return false;
  return boundary.endPage > boundary.startPage;
}

/**
 * Get page numbers that a section spans
 */
export function getSectionPages(boundary: SectionBoundary): number[] {
  const pages: number[] = [];
  const endPage = boundary.endPage ?? boundary.startPage;
  for (let p = boundary.startPage; p <= endPage; p++) {
    pages.push(p);
  }
  return pages;
}
