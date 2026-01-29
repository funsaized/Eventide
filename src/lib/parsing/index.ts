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
  // Symbol categorization
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
