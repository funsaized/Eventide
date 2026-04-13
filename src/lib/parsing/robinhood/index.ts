/**
 * Robinhood Parsing Module
 *
 * All Robinhood-specific PDF parsing logic.
 */

import "./importer";

// Types (must be first)
export * from "./types";

// PDF Loading
export * from "./pdf-loader";

// Version Detection
export * from "./version-detector";

// Parser Registry (Robinhood-internal)
export * from "./registry";

// Section Parsers
export * from "./sections";

// Versioned Parsers
export * from "./parsers";

// Import Pipeline
export {
  importStatement,
  parseDocument,
  type ImportOptions,
  type ParsedImportData,
  type ImportResult,
  type ImportPhase,
  type ProgressCallback,
} from "./import-pipeline";

// Shared importer adapter
export { RobinhoodImporter } from "./importer";

// Utilities
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
  extractStatementPeriod,
} from "./utils";
