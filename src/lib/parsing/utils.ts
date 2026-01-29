/**
 * Parsing Utilities
 *
 * Helper functions for text anchor finding, column detection, and section parsing.
 */

import type {
  TextItem,
  ExtractedDocument,
  SectionType,
  DetectedSection,
  ColumnPosition,
  ColumnLayout,
  MarketCategory,
  ParsedSymbol,
} from "./types";
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
  pattern: RegExp
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
  pattern: RegExp
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
        currentSection.endPage = allItems[i - 1]?.pageNumber ?? currentSection.startPage;
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
  type: SectionType
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
  columnNames: readonly string[]
): ColumnLayout {
  const columns: ColumnPosition[] = [];

  // Sort items by X position
  const sorted = [...headerItems].sort((a, b) => a.x - b.x);

  for (const name of columnNames) {
    // Find the header item matching this column name
    const headerItem = sorted.find((item) =>
      item.text.toLowerCase().includes(name.toLowerCase())
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
  layout: ColumnLayout
): string | null {
  const itemCenter = item.x + item.width / 2;

  for (const column of layout.columns) {
    if (itemCenter >= column.leftAbsolute && itemCenter <= column.rightAbsolute) {
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
  expectedHeaders: readonly string[]
): TextItem[] | null {
  const lines = groupIntoLines(sectionItems);

  for (const line of lines) {
    const lineText = mergeLineText(line).toLowerCase();
    const matchCount = expectedHeaders.filter((h) =>
      lineText.includes(h.toLowerCase())
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
 * Parse a date string (various formats)
 */
export function parseDate(dateStr: string): string | null {
  // Try MM/DD/YYYY format
  const mdyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Try YYYY-MM-DD format
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return isoMatch[0];
  }

  // Try MMM DD, YYYY format
  const monthNames: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04",
    may: "05", jun: "06", jul: "07", aug: "08",
    sep: "09", oct: "10", nov: "11", dec: "12",
  };

  const mmmMatch = dateStr.match(/([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
  if (mmmMatch) {
    const [, monthStr, day, year] = mmmMatch;
    const month = monthNames[monthStr.toLowerCase()];
    if (month) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
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
  expectedHeaders: readonly string[]
): boolean {
  // Continuation often repeats headers
  const headerMatchCount = expectedHeaders.filter((h) =>
    lineText.toLowerCase().includes(h.toLowerCase())
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
    // Look for "Statement Period" or similar
    const periodMatch = item.text.match(
      /Statement\s+Period[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i
    );
    if (periodMatch) {
      return parseDate(periodMatch[1]);
    }

    // Look for date ranges
    const rangeMatch = item.text.match(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/
    );
    if (rangeMatch) {
      // Return the end date as the statement date
      return parseDate(rangeMatch[2]);
    }
  }
  return null;
}
