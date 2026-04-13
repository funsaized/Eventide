/**
 * Shared Parsing Types
 *
 * Types shared across all platform parsers (Robinhood, Kalshi, ForecastEx).
 * Platform-specific types live in their respective subdirectories.
 */

// ============================================================================
// TRADE PARSING TYPES
// ============================================================================

/**
 * Trade side (YES = bought to open, NO = sold to close for binary options)
 */
export type TradeSide = "YES" | "NO";

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
  | "NCAAF"
  | "NCAAB"
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
