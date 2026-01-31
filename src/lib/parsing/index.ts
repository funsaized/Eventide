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

// PDF Loading
export {
  loadPDFFromFile,
  loadPDFFromArrayBuffer,
  flattenDocument,
  getPageItems,
  getFullText,
  findTextItems,
  getItemsInYRange,
  groupIntoLines,
  mergeLineText,
  type PDFLoadOptions,
} from "./pdf-loader";

// Parsing Utilities
export {
  // Section detection
  SECTION_PATTERNS,
  findTextAnchor,
  findAllTextAnchors,
  detectSectionType,
  isSectionHeader,
  detectSections,
  getSection,
  // Column detection
  TRADE_COLUMN_HEADERS,
  detectColumnPositions,
  getColumnForItem,
  findHeaderRow,
  // Value parsing
  parseDate,
  parseCurrency,
  parseInteger,
  parsePrice,
  // Symbol categorization (basic)
  CATEGORY_PATTERNS,
  categorizeSymbol,
  parseSymbol,
  // Row detection
  isDataRow,
  isTableContinuation,
  // Text utilities
  cleanText,
  isEmptyText,
  extractAccountNumber,
  extractStatementDate,
} from "./utils";

// Version Detection
export {
  STATEMENT_FORMAT_VERSIONS,
  detectVersion,
  getSupportedVersions,
  getVersionEffectiveDate,
  isVersionSupported,
  isRobinhoodDerivativesStatement,
  type StatementVersion,
  type VersionDetectionResult,
} from "./version-detector";

// Parser Registry
export {
  ParserRegistry,
  ParserRegistryError,
  parserRegistry,
  parseStatement,
  parseAndValidateStatement,
  registerParser,
  type ParseResult,
} from "./registry";

// Section Parsers (Phase 5)
export {
  // Boundary detection
  SECTION_DEFINITIONS,
  detectSectionBoundaries,
  getSectionItems,
  hasSection,
  validateRequiredSections,
  matchesSectionHeader,
  type SectionId,
  type SectionBoundary,
  type BoundaryDetectionResult,
  // Column calibration
  SECTION2_COLUMNS,
  SECTION5_COLUMNS,
  calibrateColumns,
  assignToColumn,
  groupIntoRows,
  parseRowToColumns,
  type ColumnConfig,
  // Section 2: Monthly Trade Confirmations
  parseSection2,
  getTradeQuantity,
  isOpeningTrade,
  isSettlement,
  getSettlementOutcome,
  filterByTradeType,
  filterBySymbol,
  groupTradesBySymbol,
  type TradeConfirmation,
  type TradeType,
  type Section2ParseResult,
  // Section 4: Purchase and Sale
  parseSection4,
  areTradesDuplicate,
  mergeTradesWithDeduplication,
  getUniqueTradesFromSections,
  type PurchaseSaleTrade,
  type Section4ParseResult,
  // Section 5: Purchase and Sale Summary
  parseSection5,
  pairPositionRows,
  getPnlBySymbol,
  getTotalPnl,
  getWinningPositions,
  getLosingPositions,
  calculateWinRate,
  validatePnl,
  findSection5Pnl,
  findPairedPosition,
  type PurchaseSaleSummaryRow,
  type PairedPosition,
  type Section5ParseResult,
} from "./sections";

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

// Versioned Parsers
export { parserV1 } from "./parsers";
