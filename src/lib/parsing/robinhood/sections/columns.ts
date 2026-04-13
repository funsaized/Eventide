/**
 * Column Calibration
 *
 * Handles column position detection and calibration for table parsing.
 * Uses percentage-based offsets for robustness across different PDF renderings.
 */

import type { TextItem, ColumnPosition, ColumnLayout } from "../types";
import { groupIntoLines, mergeLineText } from "../pdf-loader";

// Re-export ColumnLayout for use by section parsers
export type { ColumnLayout } from "../types";

// ============================================================================
// COLUMN CONFIGURATION
// ============================================================================

/**
 * Column configuration for different section types
 */
export interface ColumnConfig {
  /** Column name (identifier) */
  name: string;
  /** Header text patterns to match */
  headerPatterns: RegExp[];
  /** Expected position as percentage of page width (approximate) */
  expectedPosition?: number;
  /** Whether this column is required */
  required: boolean;
  /** Data type for parsing */
  dataType: "date" | "text" | "currency" | "integer" | "decimal";
}

/**
 * Section 2: Monthly Trade Confirmations columns
 */
export const SECTION2_COLUMNS: ColumnConfig[] = [
  {
    name: "tradeDate",
    headerPatterns: [/Trade\s*Date/i, /^Date$/i],
    expectedPosition: 0.02,
    required: true,
    dataType: "date",
  },
  {
    name: "accountType",
    headerPatterns: [/^AT$/i, /Account\s*Type/i],
    expectedPosition: 0.08,
    required: false,
    dataType: "text",
  },
  {
    name: "qtyLong",
    // Section 2 uses "Qty Long", Section 4 uses "Qty Buy Offset"
    headerPatterns: [/Qty\s*Long/i, /Qty\s*Buy/i, /Long/i, /Buy/i],
    expectedPosition: 0.12,
    required: true,
    dataType: "integer",
  },
  {
    name: "qtyShort",
    // Section 2 uses "Qty Short", Section 4 uses "Qty Sell Offset"
    headerPatterns: [/Qty\s*Short/i, /Qty\s*Sell/i, /Short/i, /Sell/i],
    expectedPosition: 0.16,
    required: true,
    dataType: "integer",
  },
  {
    name: "subtype",
    headerPatterns: [/Sub\s*type/i, /^Type$/i],
    expectedPosition: 0.20,
    required: true,
    dataType: "text",
  },
  {
    name: "symbol",
    headerPatterns: [/Symbol/i],
    expectedPosition: 0.24,
    required: true,
    dataType: "text",
  },
  {
    name: "contractYear",
    headerPatterns: [/Contract\s*Year\s*Month/i, /Contract\s*Year/i, /Year/i],
    expectedPosition: 0.52,
    required: false,
    dataType: "integer",
  },
  {
    name: "exchange",
    headerPatterns: [/Exchange/i],
    expectedPosition: 0.58,
    required: false,
    dataType: "text",
  },
  {
    name: "expDate",
    headerPatterns: [/Exp\s*Date/i, /Expiration/i],
    expectedPosition: 0.64,
    required: false,
    dataType: "date",
  },
  {
    name: "tradePrice",
    // Section 2 uses "Trade Price", Section 4 uses "Transaction Price"
    headerPatterns: [/Trade\s*Price/i, /Transaction\s*Price/i, /Price/i],
    expectedPosition: 0.72,
    required: true,
    dataType: "decimal",
  },
  {
    name: "currency",
    headerPatterns: [/Currency/i, /Ccy/i],
    expectedPosition: 0.80,
    required: false,
    dataType: "text",
  },
  {
    name: "tradeType",
    headerPatterns: [/Trade\s*Type/i, /^Type$/i],
    expectedPosition: 0.84,
    required: true,
    dataType: "text",
  },
  {
    name: "description",
    headerPatterns: [/Description/i],
    expectedPosition: 0.90,
    required: false,
    dataType: "text",
  },
];

/**
 * Section 7: Open Positions columns
 */
export const SECTION7_COLUMNS: ColumnConfig[] = [
  {
    name: "dateOpened",
    headerPatterns: [/Date\s*Opened/i, /^Date$/i],
    expectedPosition: 0.02,
    required: true,
    dataType: "date",
  },
  {
    name: "accountType",
    headerPatterns: [/^AT$/i, /Account\s*Type/i],
    expectedPosition: 0.08,
    required: false,
    dataType: "text",
  },
  {
    name: "qtyBuy",
    headerPatterns: [/Quantity\s*Buy/i, /Qty\s*Buy/i, /Buy/i],
    expectedPosition: 0.12,
    required: true,
    dataType: "integer",
  },
  {
    name: "qtySell",
    headerPatterns: [/Quantity\s*Sell/i, /Qty\s*Sell/i, /Sell/i],
    expectedPosition: 0.16,
    required: false,
    dataType: "integer",
  },
  {
    name: "subtype",
    headerPatterns: [/Sub\s*type/i, /^Type$/i],
    expectedPosition: 0.22,
    required: true,
    dataType: "text",
  },
  {
    name: "symbol",
    headerPatterns: [/Symbol/i],
    expectedPosition: 0.26,
    required: true,
    dataType: "text",
  },
  {
    name: "contractYearMonth",
    headerPatterns: [/Contract\s*Year\s*Month/i, /Contract\s*Month/i],
    expectedPosition: 0.40,
    required: false,
    dataType: "text",
  },
  {
    name: "exchange",
    headerPatterns: [/Exchange/i],
    expectedPosition: 0.50,
    required: false,
    dataType: "text",
  },
  {
    name: "expDate",
    headerPatterns: [/Exp\s*Date/i, /Expiration/i],
    expectedPosition: 0.56,
    required: false,
    dataType: "date",
  },
  {
    name: "tradePrice",
    headerPatterns: [/Trade\s*Price/i, /Price/i],
    expectedPosition: 0.64,
    required: true,
    dataType: "decimal",
  },
  {
    name: "currency",
    headerPatterns: [/Currency/i, /Ccy/i],
    expectedPosition: 0.72,
    required: false,
    dataType: "text",
  },
  {
    name: "settlementPrice",
    headerPatterns: [/Settlement\s*Price/i, /Settle/i],
    expectedPosition: 0.78,
    required: false,
    dataType: "decimal",
  },
  {
    name: "tradeType",
    headerPatterns: [/Trade\s*Type/i],
    expectedPosition: 0.84,
    required: false,
    dataType: "text",
  },
  {
    name: "description",
    headerPatterns: [/Description/i],
    expectedPosition: 0.90,
    required: false,
    dataType: "text",
  },
];

/**
 * Section 8: Open Position Summary columns
 */
export const SECTION8_COLUMNS: ColumnConfig[] = [
  {
    name: "asOfDate",
    headerPatterns: [/As\s*of\s*Date/i, /^Date$/i],
    expectedPosition: 0.02,
    required: false,
    dataType: "date",
  },
  {
    name: "accountType",
    headerPatterns: [/^AT$/i],
    expectedPosition: 0.08,
    required: false,
    dataType: "text",
  },
  {
    name: "symbol",
    headerPatterns: [/Symbol/i],
    expectedPosition: 0.14,
    required: true,
    dataType: "text",
  },
  {
    name: "exchange",
    headerPatterns: [/Exchange/i],
    expectedPosition: 0.46,
    required: false,
    dataType: "text",
  },
  {
    name: "expDate",
    headerPatterns: [/Exp\s*Date/i],
    expectedPosition: 0.54,
    required: false,
    dataType: "date",
  },
  {
    name: "totalLong",
    headerPatterns: [/Total\s*Long/i, /Long/i],
    expectedPosition: 0.60,
    required: true,
    dataType: "integer",
  },
  {
    name: "totalShort",
    headerPatterns: [/Total\s*Short/i, /Short/i],
    expectedPosition: 0.64,
    required: false,
    dataType: "integer",
  },
  {
    name: "subtype",
    headerPatterns: [/Sub\s*type/i],
    expectedPosition: 0.68,
    required: true,
    dataType: "text",
  },
  {
    name: "avgPrice",
    headerPatterns: [/Avg\s*Long/i, /Avg/i],
    expectedPosition: 0.72,
    required: true,
    dataType: "decimal",
  },
  {
    name: "unrealizedPnl",
    headerPatterns: [/OTE/i, /Unrealized\s*P[&\/]?L/i],
    expectedPosition: 0.78,
    required: true,
    dataType: "currency",
  },
  {
    name: "marketValue",
    headerPatterns: [/Market\s*Value/i, /Value/i],
    expectedPosition: 0.84,
    required: true,
    dataType: "currency",
  },
  {
    name: "currency",
    headerPatterns: [/Currency/i, /Code/i],
    expectedPosition: 0.90,
    required: false,
    dataType: "text",
  },
  {
    name: "description",
    headerPatterns: [/Description/i],
    expectedPosition: 0.94,
    required: false,
    dataType: "text",
  },
];

/**
 * Section 6: Journal Entries columns
 */
export const SECTION6_COLUMNS: ColumnConfig[] = [
  {
    name: "date",
    headerPatterns: [/^Date$/i, /Entry\s*Date/i],
    expectedPosition: 0.02,
    required: true,
    dataType: "date",
  },
  {
    name: "accountType",
    headerPatterns: [/^AT$/i, /Account\s*Type/i],
    expectedPosition: 0.10,
    required: false,
    dataType: "text",
  },
  {
    name: "description",
    headerPatterns: [/Description/i, /Entry/i, /Type/i],
    expectedPosition: 0.20,
    required: true,
    dataType: "text",
  },
  {
    name: "currency",
    headerPatterns: [/Currency/i, /Ccy/i, /Code/i],
    expectedPosition: 0.70,
    required: false,
    dataType: "text",
  },
  {
    name: "creditDebit",
    headerPatterns: [/Credit\s*\/?\s*Debit/i, /Amount/i, /Credit/i, /Debit/i],
    expectedPosition: 0.80,
    required: true,
    dataType: "currency",
  },
  {
    name: "balance",
    headerPatterns: [/Balance/i, /Running/i],
    expectedPosition: 0.90,
    required: false,
    dataType: "currency",
  },
];

/**
 * Section 10: Account Summary - key-value pairs (not columnar table)
 */
export const SECTION10_FIELD_PATTERNS: Array<{
  field: string;
  patterns: RegExp[];
  dataType: "currency" | "text" | "date";
}> = [
  {
    field: "beginningCashBalance",
    patterns: [/Beginning\s+Cash\s+Balance/i],
    dataType: "currency",
  },
  {
    field: "commissions",
    patterns: [/^Commissions$/i],
    dataType: "currency",
  },
  {
    field: "exchangeFees",
    patterns: [/Exchange\s+Fees/i],
    dataType: "currency",
  },
  {
    field: "nfaFees",
    patterns: [/NFA\s+Fees/i],
    dataType: "currency",
  },
  {
    field: "totalCommissionsAndFees",
    patterns: [/Total\s+Commissions\s+and\s+Fees/i],
    dataType: "currency",
  },
  {
    field: "grossProfitAndLoss",
    patterns: [/Gross\s+Profit\s+and\s+Loss/i, /Gross\s+P\s*&?\s*L/i],
    dataType: "currency",
  },
  {
    field: "eventContractTradeCosts",
    patterns: [/Event\s+Contract\s+Trade\s+Costs/i, /Trade\s+Costs\s*\/?\s*Proceeds/i],
    dataType: "currency",
  },
  {
    field: "cashActivity",
    patterns: [/Cash\s+Activity/i],
    dataType: "currency",
  },
  {
    field: "endingCashBalance",
    patterns: [/Ending\s+Cash\s+Balance/i],
    dataType: "currency",
  },
  {
    field: "openTradeEquity",
    patterns: [/Open\s+Trade\s+Equity/i, /Unrealized\s+Profit/i],
    dataType: "currency",
  },
  {
    field: "totalEquity",
    patterns: [/Total\s+Equity/i],
    dataType: "currency",
  },
  {
    field: "netLiquidity",
    patterns: [/Net\s+Liquidity/i],
    dataType: "currency",
  },
  {
    field: "eventContractsMarketValue",
    patterns: [/Event\s+Contracts?\s+Open\s+Position/i, /Open\s+Position\s+Market\s+Value/i],
    dataType: "currency",
  },
  {
    field: "initialMargin",
    patterns: [/Initial\s+Margin/i],
    dataType: "currency",
  },
  {
    field: "marginExcessDeficit",
    patterns: [/Margin\s+Excess/i, /Margin.*Deficit/i],
    dataType: "currency",
  },
  {
    field: "marginCall",
    patterns: [/Margin\s+Call/i],
    dataType: "currency",
  },
];

/**
 * Section 3: Trade Confirmation Summary columns
 * Contains aggregated trade information with fees
 */
export const SECTION3_COLUMNS: ColumnConfig[] = [
  {
    name: "tradeDate",
    headerPatterns: [/Trade\s*Date/i, /^Date$/i],
    expectedPosition: 0.02,
    required: true,
    dataType: "date",
  },
  {
    name: "accountType",
    headerPatterns: [/^AT$/i, /Account\s*Type/i],
    expectedPosition: 0.08,
    required: false,
    dataType: "text",
  },
  {
    name: "totalQtyLong",
    headerPatterns: [/Total\s*Qty\s*Long/i, /Qty\s*Long/i, /Long/i],
    expectedPosition: 0.12,
    required: true,
    dataType: "integer",
  },
  {
    name: "totalQtyShort",
    headerPatterns: [/Total\s*Qty\s*Short/i, /Qty\s*Short/i, /Short/i],
    expectedPosition: 0.16,
    required: false,
    dataType: "integer",
  },
  {
    name: "subtype",
    headerPatterns: [/Sub\s*type/i, /^Type$/i],
    expectedPosition: 0.20,
    required: true,
    dataType: "text",
  },
  {
    name: "symbol",
    headerPatterns: [/Symbol/i],
    expectedPosition: 0.24,
    required: true,
    dataType: "text",
  },
  {
    name: "exchange",
    headerPatterns: [/Exchange/i],
    expectedPosition: 0.52,
    required: false,
    dataType: "text",
  },
  {
    name: "expDate",
    headerPatterns: [/Exp\s*Date/i, /Expiration/i],
    expectedPosition: 0.58,
    required: false,
    dataType: "date",
  },
  {
    name: "commissions",
    headerPatterns: [/Commissions?/i],
    expectedPosition: 0.66,
    required: false,
    dataType: "currency",
  },
  {
    name: "exchangeFees",
    headerPatterns: [/Exchange\s*Fees?/i, /Exch\s*Fees?/i],
    expectedPosition: 0.72,
    required: false,
    dataType: "currency",
  },
  {
    name: "nfaFees",
    headerPatterns: [/NFA\s*Fees?/i],
    expectedPosition: 0.78,
    required: false,
    dataType: "currency",
  },
  {
    name: "totalFees",
    headerPatterns: [/Total\s*(?:Commissions?\s*and\s*)?Fees?/i, /Total$/i],
    expectedPosition: 0.84,
    required: true,
    dataType: "currency",
  },
  {
    name: "currency",
    headerPatterns: [/Currency/i, /Ccy/i],
    expectedPosition: 0.90,
    required: false,
    dataType: "text",
  },
  {
    name: "description",
    headerPatterns: [/Description/i],
    expectedPosition: 0.94,
    required: false,
    dataType: "text",
  },
];

/**
 * Section 5: Purchase and Sale Summary columns
 */
export const SECTION5_COLUMNS: ColumnConfig[] = [
  {
    name: "tradeDate",
    headerPatterns: [/Trade\s*Date/i, /^Date$/i],
    expectedPosition: 0.02,
    required: true,
    dataType: "date",
  },
  {
    name: "accountType",
    headerPatterns: [/^AT$/i, /Account\s*Type/i],
    expectedPosition: 0.08,
    required: false,
    dataType: "text",
  },
  {
    name: "totalQtyLong",
    headerPatterns: [/Total\s*Qty\s*Long/i, /Qty\s*Long/i],
    expectedPosition: 0.12,
    required: true,
    dataType: "integer",
  },
  {
    name: "totalQtyShort",
    headerPatterns: [/Total\s*Qty\s*Short/i, /Qty\s*Short/i],
    expectedPosition: 0.16,
    required: true,
    dataType: "integer",
  },
  {
    name: "subtype",
    headerPatterns: [/Sub\s*type/i, /^Type$/i],
    expectedPosition: 0.20,
    required: true,
    dataType: "text",
  },
  {
    name: "symbol",
    headerPatterns: [/Symbol/i],
    expectedPosition: 0.24,
    required: true,
    dataType: "text",
  },
  {
    name: "contractYear",
    headerPatterns: [/Contract\s*Year\s*Month/i, /Contract\s*Year/i, /Year/i],
    expectedPosition: 0.52,
    required: false,
    dataType: "integer",
  },
  {
    name: "exchange",
    headerPatterns: [/Exchange/i],
    expectedPosition: 0.58,
    required: false,
    dataType: "text",
  },
  {
    name: "expDate",
    headerPatterns: [/Exp\s*Date/i, /Expiration/i],
    expectedPosition: 0.64,
    required: false,
    dataType: "date",
  },
  {
    name: "grossPnl",
    headerPatterns: [/Gross\s*P[&\/]?L/i, /P\s*&\s*L/i, /Profit/i],
    expectedPosition: 0.72,
    required: true,
    dataType: "currency",
  },
  {
    name: "currency",
    headerPatterns: [/Currency/i, /Ccy/i],
    expectedPosition: 0.82,
    required: false,
    dataType: "text",
  },
  {
    name: "description",
    headerPatterns: [/Description/i],
    expectedPosition: 0.88,
    required: false,
    dataType: "text",
  },
];

// ============================================================================
// COLUMN DETECTION
// ============================================================================

/**
 * Find the header row in a set of text items
 */
export function findHeaderRow(
  items: TextItem[],
  columnConfigs: ColumnConfig[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _pageWidth: number // kept for API consistency with calibrateColumns
): { headerItems: TextItem[]; headerRowIndex: number } | null {
  const lines = groupIntoLines(items);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineText = mergeLineText(line).toLowerCase();

    // Count how many required column headers are in this line
    let requiredMatchCount = 0;
    let totalMatchCount = 0;

    for (const config of columnConfigs) {
      const found = config.headerPatterns.some(pattern =>
        pattern.test(lineText)
      );
      if (found) {
        totalMatchCount++;
        if (config.required) {
          requiredMatchCount++;
        }
      }
    }

    // Need at least 3 column headers and most required columns
    const requiredColumns = columnConfigs.filter(c => c.required);
    if (
      totalMatchCount >= 3 &&
      requiredMatchCount >= Math.floor(requiredColumns.length * 0.5)
    ) {
      // Find the starting index in the original items array
      let itemCount = 0;
      for (let i = 0; i < lineIndex; i++) {
        itemCount += lines[i].length;
      }

      return {
        headerItems: line,
        headerRowIndex: itemCount,
      };
    }
  }

  return null;
}

/**
 * Calibrate column positions from header row items
 */
export function calibrateColumns(
  headerItems: TextItem[],
  columnConfigs: ColumnConfig[],
  pageWidth: number
): ColumnLayout {
  const columns: ColumnPosition[] = [];

  // Sort header items by X position
  const sortedHeaders = [...headerItems].sort((a, b) => a.x - b.x);

  // Match header items to column configurations
  for (const config of columnConfigs) {
    // Find header item that matches this column's patterns
    const matchedItem = sortedHeaders.find(item =>
      config.headerPatterns.some(pattern => pattern.test(item.text))
    );

    if (matchedItem) {
      // Calculate column boundaries
      const leftAbsolute = matchedItem.x;
      const leftPercent = leftAbsolute / pageWidth;

      // Find the next header item to determine right edge
      const currentIndex = sortedHeaders.indexOf(matchedItem);
      const nextItem = sortedHeaders[currentIndex + 1];

      const rightAbsolute = nextItem
        ? nextItem.x - 5 // 5pt gap before next column
        : pageWidth;
      const rightPercent = rightAbsolute / pageWidth;

      columns.push({
        name: config.name,
        leftPercent,
        rightPercent,
        leftAbsolute,
        rightAbsolute,
      });
    } else if (config.required) {
      // Required column not found - try to infer from expected position
      if (config.expectedPosition !== undefined) {
        const leftPercent = config.expectedPosition;
        const leftAbsolute = leftPercent * pageWidth;
        const rightAbsolute = leftAbsolute + pageWidth * 0.08; // Assume 8% width

        columns.push({
          name: config.name,
          leftPercent,
          rightPercent: rightAbsolute / pageWidth,
          leftAbsolute,
          rightAbsolute,
        });
      }
    }
  }

  // Sort columns by position
  columns.sort((a, b) => a.leftPercent - b.leftPercent);

  // Adjust right edges to prevent overlap
  for (let i = 0; i < columns.length - 1; i++) {
    const current = columns[i];
    const next = columns[i + 1];

    if (current.rightAbsolute >= next.leftAbsolute) {
      current.rightAbsolute = next.leftAbsolute - 1;
      current.rightPercent = current.rightAbsolute / pageWidth;
    }
  }

  return {
    pageWidth,
    columns,
  };
}

/**
 * Assign a text item to a column based on its position
 */
export function assignToColumn(
  item: TextItem,
  layout: ColumnLayout
): string | null {
  const itemCenter = item.x + item.width / 2;
  const itemLeft = item.x;

  // First try exact boundary matching
  for (const column of layout.columns) {
    if (itemLeft >= column.leftAbsolute && itemLeft < column.rightAbsolute) {
      return column.name;
    }
  }

  // Fallback: find closest column by center distance
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

  // Only return closest if reasonably close (within 20% of page width)
  if (closestColumn && closestDistance < layout.pageWidth * 0.20) {
    return closestColumn.name;
  }

  return null;
}

/**
 * Get column by name from layout
 */
export function getColumn(
  layout: ColumnLayout,
  name: string
): ColumnPosition | null {
  return layout.columns.find(c => c.name === name) ?? null;
}

// ============================================================================
// ROW PARSING UTILITIES
// ============================================================================

/**
 * Group text items into rows based on Y position, respecting page boundaries.
 * Items on different pages are NEVER grouped into the same row.
 *
 * Note: PDF tables often have text that wraps within cells, causing slight Y variations.
 * The default tolerance of 12 pixels handles this while still separating distinct rows.
 */
export function groupIntoRows(
  items: TextItem[],
  tolerance: number = 12
): TextItem[][] {
  if (items.length === 0) return [];

  // First, group items by page number
  const itemsByPage = new Map<number, TextItem[]>();
  for (const item of items) {
    const pageItems = itemsByPage.get(item.pageNumber) ?? [];
    pageItems.push(item);
    itemsByPage.set(item.pageNumber, pageItems);
  }

  // Process each page's items separately, then combine results
  const allRows: TextItem[][] = [];

  // Sort pages by page number to maintain document order
  const sortedPageNumbers = Array.from(itemsByPage.keys()).sort((a, b) => a - b);

  for (const pageNumber of sortedPageNumbers) {
    const pageItems = itemsByPage.get(pageNumber)!;

    // Sort by Y descending (top to bottom in PDF coordinates)
    const sorted = [...pageItems].sort((a, b) => b.y - a.y);

    let currentRow: TextItem[] = [sorted[0]];
    let currentY = sorted[0].y;

    for (let i = 1; i < sorted.length; i++) {
      const item = sorted[i];
      if (Math.abs(item.y - currentY) <= tolerance) {
        // Same row (same page is guaranteed by outer loop)
        currentRow.push(item);
      } else {
        // New row - sort current row by X and save
        currentRow.sort((a, b) => a.x - b.x);
        allRows.push(currentRow);
        currentRow = [item];
        currentY = item.y;
      }
    }

    // Don't forget the last row of this page
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x);
      allRows.push(currentRow);
    }
  }

  return allRows;
}

/**
 * Parse a row of text items into column values
 */
export function parseRowToColumns(
  row: TextItem[],
  layout: ColumnLayout
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const item of row) {
    const columnName = assignToColumn(item, layout);
    if (columnName) {
      // If column already has a value, append (handles multi-part values)
      if (values[columnName]) {
        values[columnName] += " " + item.text.trim();
      } else {
        values[columnName] = item.text.trim();
      }
    }
  }

  return values;
}

/**
 * Check if a row looks like a data row (vs header, footer, or empty)
 */
export function isDataRow(
  rowValues: Record<string, string>,
  columnConfigs: ColumnConfig[]
): boolean {
  // Check if at least half of required columns have values
  const requiredColumns = columnConfigs.filter(c => c.required);
  let filledCount = 0;

  for (const config of requiredColumns) {
    const value = rowValues[config.name];
    if (value && value.trim().length > 0) {
      filledCount++;
    }
  }

  return filledCount >= Math.ceil(requiredColumns.length / 2);
}

/**
 * Check if this row is a repeated header (on page break)
 */
export function isRepeatedHeader(
  rowText: string,
  columnConfigs: ColumnConfig[]
): boolean {
  const lowerText = rowText.toLowerCase();

  // Count column header matches
  let headerMatchCount = 0;
  for (const config of columnConfigs) {
    if (config.headerPatterns.some(p => p.test(lowerText))) {
      headerMatchCount++;
    }
  }

  // If 3+ headers found, this is likely a repeated header row
  return headerMatchCount >= 3;
}
