/**
 * PDF Parsing Types
 *
 * Type definitions for the PDF parsing system.
 */

// ============================================================================
// PDF TEXT EXTRACTION TYPES
// ============================================================================

/**
 * A single text item extracted from a PDF with position information
 */
export interface TextItem {
  /** The text content */
  text: string;
  /** X position (left edge) in PDF units */
  x: number;
  /** Y position (bottom edge) in PDF units */
  y: number;
  /** Width of the text in PDF units */
  width: number;
  /** Height of the text in PDF units */
  height: number;
  /** Font name if available */
  fontName?: string;
  /** Font size if available */
  fontSize?: number;
  /** Page number (1-indexed) */
  pageNumber: number;
}

/**
 * A page of extracted text items
 */
export interface ExtractedPage {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Page width in PDF units */
  width: number;
  /** Page height in PDF units */
  height: number;
  /** All text items on this page */
  items: TextItem[];
}

/**
 * Complete extracted document
 */
export interface ExtractedDocument {
  /** Total number of pages */
  pageCount: number;
  /** All pages with their text items */
  pages: ExtractedPage[];
  /** Metadata if available */
  metadata?: {
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

// ============================================================================
// SECTION DETECTION TYPES
// ============================================================================

/**
 * Known section types in Robinhood statements
 */
export type SectionType =
  | "header" // Section 1: Account header info
  | "trades" // Section 2: Monthly Trade Confirmations
  | "activity" // Section 3: Account Activity
  | "purchase_sale" // Section 5: Purchase and Sale Summary
  | "journal" // Section 6: Journal Entries
  | "open_positions" // Section 7: Open Positions
  | "account_summary" // Section 10: Account Summary
  | "unknown";

/**
 * A detected section in the document
 */
export interface DetectedSection {
  /** Type of section */
  type: SectionType;
  /** Section header text */
  headerText: string;
  /** Starting text item index (in flattened document) */
  startIndex: number;
  /** Ending text item index (exclusive) */
  endIndex: number;
  /** Page number where section starts */
  startPage: number;
  /** Page number where section ends */
  endPage: number;
  /** All text items in this section */
  items: TextItem[];
}

// ============================================================================
// COLUMN DETECTION TYPES
// ============================================================================

/**
 * A detected column in a table
 */
export interface ColumnPosition {
  /** Column name/identifier */
  name: string;
  /** Left edge X position (percentage of page width, 0-1) */
  leftPercent: number;
  /** Right edge X position (percentage of page width, 0-1) */
  rightPercent: number;
  /** Absolute left edge X position */
  leftAbsolute: number;
  /** Absolute right edge X position */
  rightAbsolute: number;
}

/**
 * Column layout for a table section
 */
export interface ColumnLayout {
  /** Page width used for percentage calculations */
  pageWidth: number;
  /** All detected columns */
  columns: ColumnPosition[];
}

// ============================================================================
// TRADE PARSING TYPES
// ============================================================================

/**
 * Trade side (YES = bought to open, NO = sold to close for binary options)
 */
export type TradeSide = "YES" | "NO";

/**
 * A single trade row extracted from Section 2
 */
export interface TradeRow {
  /** Trade date (YYYY-MM-DD) */
  date: string;
  /** Trade side */
  side: TradeSide;
  /** Full symbol string */
  symbol: string;
  /** Price per contract (0-1 range) */
  price: number;
  /** Number of contracts */
  quantity: number;
  /** Commission/fees */
  commission: number;
  /** Raw text for debugging */
  rawText?: string;
}

/**
 * A closed position from Section 5 (Purchase and Sale Summary)
 */
export interface ClosedPositionRow {
  /** Symbol */
  symbol: string;
  /** Entry date */
  entryDate: string;
  /** Exit date */
  exitDate: string;
  /** Quantity */
  quantity: number;
  /** Gross P&L (from statement, source of truth) */
  grossPnl: number;
  /** Entry price */
  entryPrice?: number;
  /** Exit price */
  exitPrice?: number;
}

/**
 * A journal entry from Section 6
 */
export interface JournalEntry {
  /** Entry date */
  date: string;
  /** Entry type */
  type: "DEPOSIT" | "WITHDRAWAL" | "INTEREST" | "FEE" | "ADJUSTMENT" | "OTHER";
  /** Amount (positive for deposits, negative for withdrawals) */
  amount: number;
  /** Description */
  description: string;
}

/**
 * An open position from Section 7
 */
export interface OpenPositionRow {
  /** Symbol */
  symbol: string;
  /** Side */
  side: TradeSide;
  /** Quantity */
  quantity: number;
  /** Cost basis per contract */
  costBasis: number;
  /** Current/market price */
  currentPrice: number;
  /** Market value */
  marketValue: number;
  /** Unrealized P&L */
  unrealizedPnl: number;
}

/**
 * Account summary from Section 10
 */
export interface AccountSummary {
  /** Net liquidity (total account value) */
  netLiquidity: number;
  /** Ending cash balance */
  endingCash: number;
  /** Total fees for the period */
  totalFees: number;
  /** Statement date */
  statementDate: string;
  /** Period start date */
  periodStart: string;
  /** Period end date */
  periodEnd: string;
  /** Account number */
  accountNumber: string;
}

// ============================================================================
// PARSED STATEMENT TYPES
// ============================================================================

/**
 * Complete parsed statement
 */
export interface ParsedStatement {
  /** Parser version used */
  parserVersion: string;
  /** Account summary info */
  accountSummary: AccountSummary;
  /** All trades from Section 2 */
  trades: TradeRow[];
  /** Closed positions from Section 5 */
  closedPositions: ClosedPositionRow[];
  /** Journal entries from Section 6 */
  journalEntries: JournalEntry[];
  /** Open positions from Section 7 */
  openPositions: OpenPositionRow[];
  /** Parsing warnings (non-fatal issues) */
  warnings: string[];
  /** Raw sections for debugging */
  rawSections?: DetectedSection[];
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Section parse status
 */
export type ParseStatus = "success" | "partial" | "failed" | "skipped";

/**
 * Individual section parse result
 */
export interface SectionParseResult {
  /** Section type */
  section: SectionType;
  /** Parse status */
  status: ParseStatus;
  /** Status message */
  message?: string;
  /** Number of rows parsed (if applicable) */
  rowCount?: number;
  /** Expected row count (if known) */
  expectedCount?: number;
}

/**
 * P&L validation result
 */
export interface PnLValidation {
  /** Symbol */
  symbol: string;
  /** Calculated P&L from FIFO matching */
  calculatedPnl: number;
  /** Reported P&L from statement */
  reportedPnl: number;
  /** Discrepancy amount */
  discrepancy: number;
  /** Is within tolerance (±$0.01) */
  isValid: boolean;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  /** Overall success */
  success: boolean;
  /** Section-by-section results */
  sections: SectionParseResult[];
  /** P&L validation results */
  pnlValidation?: PnLValidation[];
  /** Error messages */
  errors: string[];
  /** Warning messages */
  warnings: string[];
}

// ============================================================================
// PARSER INTERFACE
// ============================================================================

/**
 * Statement parser interface
 */
export interface StatementParser {
  /** Parser version identifier */
  version: string;
  /** Human-readable description */
  description: string;
  /** Effective date range for this parser */
  effectiveFrom: Date;
  effectiveTo?: Date;

  /**
   * Parse a PDF document
   * @param document Extracted PDF document
   * @returns Parsed statement
   */
  parse(document: ExtractedDocument): Promise<ParsedStatement>;

  /**
   * Validate parsing results
   * @param result Parsed statement
   * @returns Validation result
   */
  validate(result: ParsedStatement): ValidationResult;

  /**
   * Check if this parser can handle the document
   * @param document Extracted PDF document
   * @returns True if parser is compatible
   */
  canParse(document: ExtractedDocument): boolean;
}

// ============================================================================
// SYMBOL CATEGORIZATION
// ============================================================================

/**
 * Known market categories
 */
export type MarketCategory =
  | "NFL"
  | "NBA"
  | "MLB"
  | "NHL"
  | "Soccer"
  | "Tennis"
  | "Golf"
  | "Economics"
  | "Politics"
  | "Weather"
  | "Entertainment"
  | "Crypto"
  | "Other";

/**
 * Parsed symbol information
 */
export interface ParsedSymbol {
  /** Original full symbol */
  raw: string;
  /** Detected category */
  category: MarketCategory;
  /** Exchange prefix (e.g., "KX") */
  exchange?: string;
  /** Event type (e.g., "NFLGAME") */
  eventType?: string;
  /** Event date if extractable */
  eventDate?: string;
  /** Teams/participants if extractable */
  participants?: string[];
}
