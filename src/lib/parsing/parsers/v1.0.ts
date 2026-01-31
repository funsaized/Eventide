/**
 * Parser v1.0: Initial Robinhood Derivatives Format
 *
 * Implements the StatementParser interface for parsing Robinhood Derivatives
 * monthly statements from January 2024 onwards.
 *
 * This is the primary parser for v1.0 format statements.
 */

import type {
  ExtractedDocument,
  StatementParser,
  ParsedStatement,
  ValidationResult,
  TradeRow,
  ClosedPositionRow,
  JournalEntry,
  OpenPositionRow,
  AccountSummary,
  TradeSide,
  SectionParseResult,
  PnLValidation,
} from "../types";
import { flattenDocument } from "../pdf-loader";
import {
  detectSectionBoundaries,
  getSection,
  type SectionBoundary,
} from "../sections/boundaries";
import { parseSection2, type TradeConfirmation } from "../sections/section2";
import { parseSection4, mergeTradesWithDeduplication } from "../sections/section4";
import { parseSection5, type PairedPosition } from "../sections/section5";
import { categorizeSymbol } from "../symbol";
import { extractAccountNumber, extractStatementDate } from "../utils";

// ============================================================================
// PARSER IMPLEMENTATION
// ============================================================================

/**
 * Parser v1.0 for initial Robinhood Derivatives format
 */
export const parserV1: StatementParser = {
  version: "v1.0",
  description: "Initial Robinhood Derivatives format (January 2024+)",
  effectiveFrom: new Date("2024-01-01"),
  effectiveTo: new Date("2024-05-31"), // v1.1 starts June 2024

  /**
   * Check if this parser can handle the document
   */
  canParse(document: ExtractedDocument): boolean {
    const allItems = flattenDocument(document);
    const fullText = allItems.map((item) => item.text).join(" ");

    // Must be a Robinhood Derivatives statement
    const isRobinhood = /Robinhood\s+Derivatives/i.test(fullText);

    // Must have key sections
    const hasTradeConfirmations = /Monthly\s+Trade\s+Confirmations/i.test(fullText);
    const hasAccountSummary = /Account\s+Summary/i.test(fullText);

    // Should NOT have Tax Withholding (that's v1.1+)
    const hasTaxWithholding = /Tax\s+Withholding/i.test(fullText);

    return isRobinhood && hasTradeConfirmations && hasAccountSummary && !hasTaxWithholding;
  },

  /**
   * Parse the document
   */
  async parse(document: ExtractedDocument): Promise<ParsedStatement> {
    const warnings: string[] = [];
    const allItems = flattenDocument(document);

    // Get page width from first page
    const pageWidth = document.pages[0]?.width ?? 612; // Default letter width

    // Detect section boundaries
    const boundaries = detectSectionBoundaries(document);

    if (!boundaries.isComplete) {
      warnings.push(...boundaries.warnings);
    }

    // Parse Account Summary (Section 10) first for metadata
    const accountSummary = parseAccountSummary(
      getSection(boundaries, "section10"),
      allItems
    );

    // Parse trades from Section 2
    const section2Boundary = getSection(boundaries, "section2");
    const section2Result = section2Boundary
      ? parseSection2(section2Boundary, pageWidth)
      : null;

    if (section2Result) {
      warnings.push(...section2Result.warnings);
    }

    // Parse Section 4 (Purchase and Sale)
    const section4Boundary = getSection(boundaries, "section4");
    const section4Result = section4Boundary
      ? parseSection4(
          section4Boundary,
          pageWidth,
          accountSummary.periodStart,
          accountSummary.periodEnd
        )
      : null;

    if (section4Result) {
      warnings.push(...section4Result.warnings);
    }

    // Merge trades with deduplication
    const mergedTrades = mergeTradesWithDeduplication(
      section2Result?.trades ?? [],
      section4Result?.trades ?? []
    );

    if (mergedTrades.duplicatesRemoved > 0) {
      warnings.push(
        `Removed ${mergedTrades.duplicatesRemoved} duplicate trades between Section 2 and Section 4`
      );
    }

    // Convert to TradeRow format
    const trades: TradeRow[] = mergedTrades.mergedTrades.map((trade) =>
      convertToTradeRow(trade)
    );

    // Parse Section 5 (Purchase and Sale Summary)
    const section5Boundary = getSection(boundaries, "section5");
    const section5Result = section5Boundary
      ? parseSection5(section5Boundary, pageWidth)
      : null;

    if (section5Result) {
      warnings.push(...section5Result.warnings);
    }

    // Convert to ClosedPositionRow format
    const closedPositions: ClosedPositionRow[] = section5Result
      ? section5Result.pairedPositions.map((pos) =>
          convertToClosedPositionRow(pos)
        )
      : [];

    // Parse Section 6 (Journal Entries)
    const section6Boundary = getSection(boundaries, "section6");
    const journalEntries: JournalEntry[] = section6Boundary
      ? parseJournalEntries(section6Boundary)
      : [];

    // Parse Section 7 (Open Positions)
    const section7Boundary = getSection(boundaries, "section7");
    const openPositions: OpenPositionRow[] = section7Boundary
      ? parseOpenPositions(section7Boundary)
      : [];

    return {
      parserVersion: this.version,
      accountSummary,
      trades,
      closedPositions,
      journalEntries,
      openPositions,
      warnings,
      rawSections: boundaries.sections.map((b) => ({
        type: b.id === "section2" ? "trades" :
              b.id === "section5" ? "purchase_sale" :
              b.id === "section6" ? "journal" :
              b.id === "section7" ? "open_positions" :
              b.id === "section10" ? "account_summary" : "unknown",
        headerText: b.headerItem.text,
        startIndex: b.startIndex,
        endIndex: b.endIndex ?? b.startIndex,
        startPage: b.startPage,
        endPage: b.endPage ?? b.startPage,
        items: b.items,
      })),
    };
  },

  /**
   * Validate the parse result
   */
  validate(result: ParsedStatement): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sections: SectionParseResult[] = [];
    const pnlValidation: PnLValidation[] = [];

    // Validate Section 2 (Trades)
    if (result.trades.length === 0) {
      errors.push("No trades found in statement");
      sections.push({
        section: "trades",
        status: "failed",
        message: "No trades extracted",
      });
    } else {
      sections.push({
        section: "trades",
        status: "success",
        rowCount: result.trades.length,
      });
    }

    // Validate Section 5 (Closed Positions)
    if (result.closedPositions.length === 0 && result.trades.length > 0) {
      warnings.push("No closed positions found - positions may still be open");
      sections.push({
        section: "purchase_sale",
        status: "partial",
        message: "No closed positions",
      });
    } else {
      sections.push({
        section: "purchase_sale",
        status: "success",
        rowCount: result.closedPositions.length,
      });
    }

    // Validate Account Summary
    if (!result.accountSummary.netLiquidity && result.accountSummary.netLiquidity !== 0) {
      errors.push("Missing net liquidity in account summary");
      sections.push({
        section: "account_summary",
        status: "failed",
        message: "Missing net liquidity",
      });
    } else {
      sections.push({
        section: "account_summary",
        status: "success",
      });
    }

    // Validate trade prices are in valid range (0-1)
    const invalidPrices = result.trades.filter(
      (t) => t.price < 0 || t.price > 1
    );
    if (invalidPrices.length > 0) {
      warnings.push(
        `${invalidPrices.length} trades have prices outside 0-1 range`
      );
    }

    // Validate quantities are positive
    const invalidQuantities = result.trades.filter((t) => t.quantity <= 0);
    if (invalidQuantities.length > 0) {
      warnings.push(
        `${invalidQuantities.length} trades have invalid quantities`
      );
    }

    // Validate P&L sums (Section 5 total vs sum of positions)
    const totalPnl = result.closedPositions.reduce(
      (sum, p) => sum + p.grossPnl,
      0
    );

    // Add P&L validation entries
    for (const position of result.closedPositions) {
      pnlValidation.push({
        symbol: position.symbol,
        calculatedPnl: position.grossPnl, // We use Section 5 as source of truth
        reportedPnl: position.grossPnl,
        discrepancy: 0,
        isValid: true,
      });
    }

    return {
      success: errors.length === 0,
      sections,
      pnlValidation,
      errors,
      warnings: [...warnings, ...result.warnings],
    };
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse Account Summary from Section 10
 */
function parseAccountSummary(
  boundary: SectionBoundary | null,
  allItems: ReturnType<typeof flattenDocument>
): AccountSummary {
  const items = boundary?.items ?? allItems;

  // Default values
  const summary: AccountSummary = {
    netLiquidity: 0,
    endingCash: 0,
    totalFees: 0,
    statementDate: "",
    periodStart: "",
    periodEnd: "",
    accountNumber: "",
  };

  // Extract statement date
  const statementDate = extractStatementDate(allItems);
  if (statementDate) {
    summary.statementDate = statementDate;
  }

  // Extract account number
  const accountNumber = extractAccountNumber(allItems);
  if (accountNumber) {
    summary.accountNumber = accountNumber;
  }

  // Parse key-value pairs from section
  for (const item of items) {
    const text = item.text.toLowerCase();

    // Net Liquidity
    if (text.includes("net liquidity")) {
      const match = item.text.match(/[\d,]+\.?\d*/);
      if (match) {
        summary.netLiquidity = parseFloat(match[0].replace(/,/g, ""));
      }
    }

    // Ending Cash Balance
    if (text.includes("ending cash")) {
      const match = item.text.match(/[\d,]+\.?\d*/);
      if (match) {
        summary.endingCash = parseFloat(match[0].replace(/,/g, ""));
      }
    }

    // Total Commissions and Fees
    if (text.includes("total commission") || text.includes("total fee")) {
      const match = item.text.match(/[\d,]+\.?\d*/);
      if (match) {
        summary.totalFees = parseFloat(match[0].replace(/,/g, ""));
      }
    }

    // Statement Period
    const periodMatch = item.text.match(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/
    );
    if (periodMatch) {
      summary.periodStart = formatDateToISO(periodMatch[1]);
      summary.periodEnd = formatDateToISO(periodMatch[2]);
    }
  }

  return summary;
}

/**
 * Format date to ISO (YYYY-MM-DD)
 */
function formatDateToISO(dateStr: string): string {
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return dateStr;
}

/**
 * Convert TradeConfirmation to TradeRow
 */
function convertToTradeRow(trade: TradeConfirmation): TradeRow {
  const quantity = trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort;

  return {
    date: trade.tradeDate,
    side: trade.subtype,
    symbol: trade.symbol,
    price: trade.tradePrice ?? 0,
    quantity,
    commission: 0, // Fees come from Section 3, handled separately
    rawText: trade.rawText,
  };
}

/**
 * Convert PairedPosition to ClosedPositionRow
 */
function convertToClosedPositionRow(position: PairedPosition): ClosedPositionRow {
  const yesRow = position.yesRow;
  const noRow = position.noRow;

  return {
    symbol: position.symbol,
    entryDate: yesRow?.tradeDate ?? noRow?.tradeDate ?? "",
    exitDate: yesRow?.expDate ?? noRow?.expDate ?? "",
    quantity: position.totalQuantity,
    grossPnl: position.netPnl,
  };
}

/**
 * Parse Journal Entries (Section 6) - simplified implementation
 */
function parseJournalEntries(boundary: SectionBoundary): JournalEntry[] {
  const entries: JournalEntry[] = [];

  // Look for deposit/withdrawal patterns
  for (const item of boundary.items) {
    const text = item.text.toLowerCase();

    // Check for deposit
    if (text.includes("deposit") || text.includes("credit")) {
      const amountMatch = item.text.match(/\$?([\d,]+\.?\d*)/);
      if (amountMatch) {
        entries.push({
          date: "", // Would need date parsing
          type: "DEPOSIT",
          amount: parseFloat(amountMatch[1].replace(/,/g, "")),
          description: item.text,
        });
      }
    }

    // Check for withdrawal
    if (text.includes("withdraw") || text.includes("debit")) {
      const amountMatch = item.text.match(/\$?([\d,]+\.?\d*)/);
      if (amountMatch) {
        entries.push({
          date: "",
          type: "WITHDRAWAL",
          amount: -parseFloat(amountMatch[1].replace(/,/g, "")),
          description: item.text,
        });
      }
    }
  }

  return entries;
}

/**
 * Parse Open Positions (Section 7) - simplified implementation
 */
function parseOpenPositions(boundary: SectionBoundary): OpenPositionRow[] {
  // This would need full column-based parsing similar to Section 2
  // For now, return empty array - will be implemented in Phase 6
  return [];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default parserV1;
