/**
 * PDF Parsing Module
 *
 * Exports all parsing utilities for Robinhood Derivatives statement processing.
 */

// Shared types
export type {
  TradeSide,
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
