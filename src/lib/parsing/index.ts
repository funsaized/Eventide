/**
 * Parsing Module
 *
 * Exports platform parsing utilities and shared helpers.
 */

// Core abstractions (ImporterRegistry, shared types)
export { ImporterRegistry, importerRegistry } from "./core";
export type {
  ImportPhase,
  ProgressCallback,
  ParseOptions,
  ImportPreviewResult,
  ImportResult,
  SourceImporter,
} from "./core";

// Shared types
export type {
  TradeSide,
  MarketCategory,
  ParsedSymbol,
} from "./types";

// Robinhood parsing (re-exported for backward compatibility)
export * from "./robinhood";

// Kalshi parsing
export * from "./kalshi";

// Symbol Parsing
export {
  CATEGORY_PATTERNS,
  categorizeSymbol,
  parseSymbol,
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
} from "./symbol";
