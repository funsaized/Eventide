/**
 * PDF Parsing Module
 *
 * Exports all parsing utilities for Robinhood Derivatives statement processing.
 */

// Types
export type {
  TextItem,
  ExtractedPage,
  ExtractedDocument,
  SectionType,
  DetectedSection,
  ColumnPosition,
  ColumnLayout,
  TradeSide,
  TradeRow,
  ClosedPositionRow,
  JournalEntry,
  OpenPositionRow,
  AccountSummary,
  ParsedStatement,
  ParseStatus,
  SectionParseResult,
  PnLValidation,
  ValidationResult,
  StatementParser,
  MarketCategory,
  ParsedSymbol,
} from "./types";

// Robinhood parsing (re-exported for backward compatibility)
export * from "./robinhood";

// Symbol Parsing (Enhanced)
export {
  extractEventDate,
  formatEventDate,
  extractExchange,
  extractEventType,
  extractParticipants,
  getSubcategory,
  getBaseSymbol,
  isSameEvent,
  getOutcome,
  isBinaryMarket,
  getEventDescription,
  groupByCategory,
  getCategoryStats,
  CATEGORY_PATTERNS as ENHANCED_CATEGORY_PATTERNS,
} from "./symbol";
