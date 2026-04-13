/**
 * Parsing Utilities
 *
 * Helper functions for text anchor finding, column detection, and section parsing.
 */

import { parse, format, isValid, startOfMonth, endOfMonth } from "date-fns";
import type {
  TextItem,
  ExtractedDocument,
  SectionType,
  DetectedSection,
  ColumnPosition,
  ColumnLayout,
  MarketCategory,
  ParsedSymbol,
} from "../types";
import { flattenDocument, groupIntoLines, mergeLineText } from "./pdf-loader";

// ============================================================================
// SECTION DETECTION
// ============================================================================

/**
 * Section header patterns for Robinhood statements
 */
export const SECTION_PATTERNS: Record<SectionType, RegExp> = {
  header: /^Robinhood\s+Derivatives/i,
  trades: /Monthly\s+Trade\s+Confirmations?/i,
  activity: /Account\s+Activity/i,
  purchase_sale: /Purchase\s+and\s+Sale/i,
  journal: /Journal\s+Entries/i,
  open_positions: /Open\s+Positions?/i,
  account_summary: /Account\s+Summary/i,
  unknown: /^$/,
};

/**
 * Find text items matching a pattern
 */
export function findTextAnchor(
  items: TextItem[],
  pattern: RegExp,
): { item: TextItem; index: number } | null {
  for (let i = 0; i < items.length; i++) {
    if (pattern.test(items[i].text)) {
      return { item: items[i], index: i };
    }
  }
  return null;
}

/**
 * Find all occurrences of a pattern
 */
export function findAllTextAnchors(
  items: TextItem[],
  pattern: RegExp,
): { item: TextItem; index: number }[] {
  const results: { item: TextItem; index: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    if (pattern.test(items[i].text)) {
      results.push({ item: items[i], index: i });
    }
  }
  return results;
}

/**
 * Detect section type from text
 */
export function detectSectionType(text: string): SectionType {
  for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (type !== "unknown" && pattern.test(text)) {
      return type as SectionType;
    }
  }
  return "unknown";
}

/**
 * Check if text is a section header
 */
export function isSectionHeader(text: string): boolean {
  return detectSectionType(text) !== "unknown";
}

/**
 * Detect all sections in a document
 */
export function detectSections(document: ExtractedDocument): DetectedSection[] {
  const allItems = flattenDocument(document);
  const sections: DetectedSection[] = [];

  let currentSection: Partial<DetectedSection> | null = null;
  let currentStartIndex = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const sectionType = detectSectionType(item.text);

    if (sectionType !== "unknown") {
      // Found a new section header
      // Close the previous section if exists
      if (currentSection && currentSection.type) {
        currentSection.endIndex = i;
        currentSection.endPage =
          allItems[i - 1]?.pageNumber ?? currentSection.startPage;
        currentSection.items = allItems.slice(currentStartIndex, i);
        sections.push(currentSection as DetectedSection);
      }

      // Start new section
      currentSection = {
        type: sectionType,
        headerText: item.text,
        startIndex: i,
        startPage: item.pageNumber,
      };
      currentStartIndex = i;
    }
  }

  // Close the last section
  if (currentSection && currentSection.type) {
    currentSection.endIndex = allItems.length;
    currentSection.endPage = allItems[allItems.length - 1]?.pageNumber ?? 1;
    currentSection.items = allItems.slice(currentStartIndex);
    sections.push(currentSection as DetectedSection);
  }

  return sections;
}

/**
 * Get a specific section from the document
 */
export function getSection(
  document: ExtractedDocument,
  type: SectionType,
): DetectedSection | null {
  const sections = detectSections(document);
  return sections.find((s) => s.type === type) ?? null;
}

// ============================================================================
// COLUMN DETECTION
// ============================================================================

/**
 * Known column headers for Section 2 (Trades)
 */
export const TRADE_COLUMN_HEADERS = [
  "Date",
  "Subtype",
  "Symbol",
  "Price",
  "Qty",
  "Commission",
] as const;

/**
 * Detect column positions from a header row
 */
export function detectColumnPositions(
  headerItems: TextItem[],
  pageWidth: number,
  columnNames: readonly string[],
): ColumnLayout {
  const columns: ColumnPosition[] = [];

  // Sort items by X position
  const sorted = [...headerItems].sort((a, b) => a.x - b.x);

  for (const name of columnNames) {
    // Find the header item matching this column name
    const headerItem = sorted.find((item) =>
      item.text.toLowerCase().includes(name.toLowerCase()),
    );

    if (headerItem) {
      // Calculate column boundaries
      // Left edge is the item's X position
      const leftAbsolute = headerItem.x;

      // Find the next column to determine right edge
      const currentIndex = sorted.indexOf(headerItem);
      const nextItem = sorted[currentIndex + 1];
      const rightAbsolute = nextItem
        ? nextItem.x - 5 // 5pt gap before next column
        : pageWidth; // Last column extends to page edge

      columns.push({
        name,
        leftPercent: leftAbsolute / pageWidth,
        rightPercent: rightAbsolute / pageWidth,
        leftAbsolute,
        rightAbsolute,
      });
    }
  }

  return { pageWidth, columns };
}

/**
 * Determine which column a text item belongs to
 */
export function getColumnForItem(
  item: TextItem,
  layout: ColumnLayout,
): string | null {
  const itemCenter = item.x + item.width / 2;

  for (const column of layout.columns) {
    if (
      itemCenter >= column.leftAbsolute &&
      itemCenter <= column.rightAbsolute
    ) {
      return column.name;
    }
  }

  // Fallback: find closest column
  let closestColumn: ColumnPosition | null = null;
  let closestDistance = Infinity;

  for (const column of layout.columns) {
    const columnCenter = (column.leftAbsolute + column.rightAbsolute) / 2;
    const distance = Math.abs(itemCenter - columnCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestColumn = column;
    }
  }

  return closestColumn?.name ?? null;
}

/**
 * Find the header row for a section
 */
export function findHeaderRow(
  sectionItems: TextItem[],
  expectedHeaders: readonly string[],
): TextItem[] | null {
  const lines = groupIntoLines(sectionItems);

  for (const line of lines) {
    const lineText = mergeLineText(line).toLowerCase();
    const matchCount = expectedHeaders.filter((h) =>
      lineText.includes(h.toLowerCase()),
    ).length;

    // If most headers are found, this is likely the header row
    if (matchCount >= expectedHeaders.length * 0.5) {
      return line;
    }
  }

  return null;
}

// ============================================================================
// VALUE PARSING
// ============================================================================

/**
 * Supported date formats for parsing
 */
const DATE_FORMATS = [
  "yyyy-MM-dd", // ISO: 2025-09-30
  "M/d/yyyy", // US: 9/30/2025
  "MM/dd/yyyy", // US padded: 09/30/2025
  "MMM d, yyyy", // Long: Sep 30, 2025
  "MMM dd, yyyy", // Long padded: Sep 30, 2025
  "MMMM d, yyyy", // Full month: September 30, 2025
  "MMMM dd, yyyy", // Full month padded: September 30, 2025
];

/**
 * Parse a date string (various formats) and return ISO format (YYYY-MM-DD)
 * Uses date-fns for robust parsing
 *
 * Handles dates that may have been split across PDF text items and
 * concatenated with spaces, e.g., "2025-09- 20" -> "2025-09-20"
 */
export function parseDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;

  // Normalize: remove spaces around hyphens and slashes (common in concatenated PDF text)
  // "2025-09- 20" -> "2025-09-20"
  // "09/ 30/ 2025" -> "09/30/2025"
  let cleaned = dateStr
    .trim()
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*\/\s*/g, "/");

  // Try each format until one works
  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(cleaned, fmt, new Date());
      if (isValid(parsed)) {
        return format(parsed, "yyyy-MM-dd");
      }
    } catch {
      // Continue to next format
    }
  }

  return null;
}

/**
 * Parse a currency value
 */
export function parseCurrency(value: string): number | null {
  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, "").replace(/[()]/g, "-");

  // Handle parentheses for negative values
  const isNegative = value.includes("(") || cleaned.startsWith("-");
  const numericPart = cleaned.replace(/-/g, "");

  const parsed = parseFloat(numericPart);
  if (isNaN(parsed)) return null;

  return isNegative ? -parsed : parsed;
}

/**
 * Parse an integer value
 */
export function parseInteger(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, "");
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse a decimal/price value (0-1 range for binary options)
 */
export function parsePrice(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// ============================================================================
// SYMBOL CATEGORIZATION
// ============================================================================

/**
 * Category patterns for Robinhood prediction markets
 */
export const CATEGORY_PATTERNS: [MarketCategory, RegExp][] = [
  ["NFL", /^KX.*NFL/i],
  ["NBA", /^KX.*NBA/i],
  ["MLB", /^KX.*MLB/i],
  ["NHL", /^KX.*NHL/i],
  ["Soccer", /^KX.*(SOCCER|MLS|UEFA|FIFA|EPL)/i],
  ["Tennis", /^KX.*(TENNIS|USOPEN|WIMBLEDON)/i],
  ["Golf", /^KX.*(GOLF|PGA|MASTERS)/i],
  ["Economics", /^KX.*(FED|CPI|GDP|FOMC|JOBS|INFLATION|RATE)/i],
  ["Politics", /^KX.*(ELECTION|PRESIDENT|CONGRESS|SENATE|VOTE)/i],
  ["Weather", /^KX.*(WEATHER|TEMP|HURRICANE)/i],
  ["Entertainment", /^KX.*(OSCAR|EMMY|GRAMMY|MOVIE|TV)/i],
  ["Crypto", /^KX.*(BTC|ETH|CRYPTO|BITCOIN)/i],
];

/**
 * Categorize a symbol
 */
export function categorizeSymbol(symbol: string): MarketCategory {
  for (const [category, pattern] of CATEGORY_PATTERNS) {
    if (pattern.test(symbol)) {
      return category;
    }
  }
  return "Other";
}

/**
 * Parse a full symbol string
 */
export function parseSymbol(symbol: string): ParsedSymbol {
  const category = categorizeSymbol(symbol);

  // Try to extract parts from the symbol
  // Format: KXNFLGAME-25SEP04DALPHI-PHI
  const parts = symbol.split("-");

  let exchange: string | undefined;
  let eventType: string | undefined;
  let eventDate: string | undefined;
  let participants: string[] | undefined;

  if (parts.length >= 1) {
    // First part usually has exchange + event type
    const firstPart = parts[0];
    const exchangeMatch = firstPart.match(/^([A-Z]{2,3})/);
    if (exchangeMatch) {
      exchange = exchangeMatch[1];
      eventType = firstPart.slice(exchange.length);
    }
  }

  if (parts.length >= 2) {
    // Second part often has date + teams
    const secondPart = parts[1];
    const dateMatch = secondPart.match(/(\d{2}[A-Z]{3}\d{2})/);
    if (dateMatch) {
      eventDate = dateMatch[1];
    }
  }

  if (parts.length >= 3) {
    // Last part(s) often have teams
    participants = parts.slice(2);
  }

  return {
    raw: symbol,
    category,
    exchange,
    eventType,
    eventDate,
    participants,
  };
}

// ============================================================================
// ROW DETECTION
// ============================================================================

/**
 * Check if a line looks like a data row (vs header or footer)
 */
export function isDataRow(lineText: string): boolean {
  // Data rows typically start with a date
  const startsWithDate = /^\d{1,2}\/\d{1,2}\/\d{4}/.test(lineText);

  // Or contain numeric values
  const hasNumbers = /\d+\.\d{2}/.test(lineText);

  // And don't match section headers
  const isHeader = isSectionHeader(lineText);

  // And aren't page footers
  const isFooter = /page\s+\d+|continued/i.test(lineText);

  return (startsWithDate || hasNumbers) && !isHeader && !isFooter;
}

/**
 * Check if a line is a table continuation (same table, new page)
 */
export function isTableContinuation(
  lineText: string,
  expectedHeaders: readonly string[],
): boolean {
  // Continuation often repeats headers
  const headerMatchCount = expectedHeaders.filter((h) =>
    lineText.toLowerCase().includes(h.toLowerCase()),
  ).length;

  return headerMatchCount >= 2;
}

// ============================================================================
// TEXT UTILITIES
// ============================================================================

/**
 * Clean up extracted text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width chars
    .trim();
}

/**
 * Check if text contains only whitespace/special chars
 */
export function isEmptyText(text: string): boolean {
  return cleanText(text).length === 0;
}

/**
 * Extract account number from header section
 */
export function extractAccountNumber(items: TextItem[]): string | null {
  for (const item of items) {
    // Account numbers typically follow "Account:" or similar
    const match = item.text.match(/Account[:\s#]*([A-Z0-9-]+)/i);
    if (match) {
      return match[1];
    }

    // Also try standalone patterns
    const standaloneMatch = item.text.match(/^[A-Z]{2,4}\d{6,10}$/);
    if (standaloneMatch) {
      return standaloneMatch[0];
    }
  }
  return null;
}

/**
 * Extract statement date from header section
 */
export function extractStatementDate(items: TextItem[]): string | null {
  for (const item of items) {
    // Look for "Statement Period: Month DD, YYYY" format
    const periodMatch = item.text.match(
      /Statement\s+Period[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    );
    if (periodMatch) {
      return parseDate(periodMatch[1]);
    }

    // Look for date ranges "MM/DD/YYYY - MM/DD/YYYY" (use end date)
    const rangeMatch = item.text.match(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/,
    );
    if (rangeMatch) {
      return parseDate(rangeMatch[2]);
    }

    // Look for "Date:" followed by any supported date format
    const dateMatch = item.text.match(/Date[:\s]+(\S+)/i);
    if (dateMatch) {
      const parsed = parseDate(dateMatch[1]);
      if (parsed) return parsed;
    }
  }
  return null;
}

/**
 * Extract statement period (start and end dates) from document
 * Returns [periodStart, periodEnd] in ISO format
 */
export function extractStatementPeriod(
  items: TextItem[],
): [string | null, string | null] {
  // First, look for explicit date range
  for (const item of items) {
    const rangeMatch = item.text.match(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/,
    );
    if (rangeMatch) {
      return [parseDate(rangeMatch[1]), parseDate(rangeMatch[2])];
    }
  }

  // If no explicit range, derive from statement date (assume full month)
  const statementDate = extractStatementDate(items);
  if (statementDate) {
    const parsed = parse(statementDate, "yyyy-MM-dd", new Date());
    if (isValid(parsed)) {
      const periodStart = format(startOfMonth(parsed), "yyyy-MM-dd");
      const periodEnd = format(endOfMonth(parsed), "yyyy-MM-dd");
      return [periodStart, periodEnd];
    }
  }

  return [null, null];
}
