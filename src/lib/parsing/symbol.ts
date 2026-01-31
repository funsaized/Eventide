/**
 * Symbol Parsing and Categorization
 *
 * Parses Robinhood/Kalshi prediction market symbols to extract:
 * - Market category (NFL, Economics, etc.)
 * - Event type (game, decision, etc.)
 * - Event date
 * - Participants (teams, candidates, etc.)
 * - Outcome being bet on
 */

import type { MarketCategory, ParsedSymbol } from "./types";

// ============================================================================
// CATEGORY PATTERNS
// ============================================================================

/**
 * Category pattern definition
 */
interface CategoryPattern {
  category: MarketCategory;
  pattern: RegExp;
  subcategories?: string[];
}

/**
 * Comprehensive category patterns covering 15+ market types
 * Ordered by specificity (more specific patterns first)
 */
export const CATEGORY_PATTERNS: CategoryPattern[] = [
  // Sports - American Football
  {
    category: "NFL",
    pattern: /^KX.*NFL(?:GAME|PLAYER|PROP)?/i,
    subcategories: ["Game", "Player Props", "Season"],
  },
  {
    category: "NFL",
    pattern: /^KX.*(?:SUPERBOWL|SB[0-9]+)/i,
    subcategories: ["Super Bowl"],
  },

  // Sports - College Football
  {
    category: "Other",
    pattern: /^KX.*NCAA[AF]?(?:GAME|FB)?/i,
    subcategories: ["College Football"],
  },
  {
    category: "Other",
    pattern: /^KX.*CFBGAME/i,
    subcategories: ["College Football"],
  },

  // Sports - Basketball
  {
    category: "NBA",
    pattern: /^KX.*NBA(?:GAME|PLAYER|PROP)?/i,
    subcategories: ["Game", "Player Props"],
  },
  {
    category: "NBA",
    pattern: /^KX.*(?:NBAALLSTAR|NBAFINALS)/i,
    subcategories: ["Finals", "All-Star"],
  },
  {
    category: "Other",
    pattern: /^KX.*NCAAB(?:GAME)?/i,
    subcategories: ["College Basketball"],
  },
  {
    category: "Other",
    pattern: /^KX.*MARCH\s*MADNESS/i,
    subcategories: ["March Madness"],
  },

  // Sports - Baseball
  {
    category: "MLB",
    pattern: /^KX.*MLB(?:GAME|PLAYER)?/i,
    subcategories: ["Game", "Player Props"],
  },
  {
    category: "MLB",
    pattern: /^KX.*(?:WORLDSERIES|MLBPLAYOFF)/i,
    subcategories: ["Playoffs", "World Series"],
  },

  // Sports - Hockey
  {
    category: "NHL",
    pattern: /^KX.*NHL(?:GAME|PLAYER)?/i,
    subcategories: ["Game", "Player Props"],
  },
  {
    category: "NHL",
    pattern: /^KX.*STANLEYCUP/i,
    subcategories: ["Stanley Cup"],
  },

  // Sports - Soccer
  {
    category: "Soccer",
    pattern: /^KX.*(?:SOCCER|MLS|UEFA|FIFA|EPL|LALIGA|BUNDESLIGA|SERIEA|LIGUE1)/i,
    subcategories: ["MLS", "EPL", "UEFA", "World Cup"],
  },
  {
    category: "Soccer",
    pattern: /^KX.*(?:WORLDCUP|EURO[0-9]+)/i,
    subcategories: ["International"],
  },

  // Sports - Tennis
  {
    category: "Tennis",
    pattern: /^KX.*(?:USO(?:MEN|WOMEN)|USOPEN)/i,
    subcategories: ["US Open"],
  },
  {
    category: "Tennis",
    pattern: /^KX.*(?:WIMBLEDON|FRENCHOPEN|AUSOPEN|TENNIS)/i,
    subcategories: ["Grand Slam"],
  },

  // Sports - Golf
  {
    category: "Golf",
    pattern: /^KX.*(?:GOLF|PGA|MASTERS|USOPEN|THEOPEN|PGACHAMP)/i,
    subcategories: ["PGA Tour", "Majors"],
  },

  // Sports - Other
  {
    category: "Other",
    pattern: /^KX.*(?:UFC|MMA|BOXING|FIGHT)/i,
    subcategories: ["Combat Sports"],
  },
  {
    category: "Other",
    pattern: /^KX.*(?:NASCAR|F1|INDY|RACING)/i,
    subcategories: ["Motorsports"],
  },
  {
    category: "Other",
    pattern: /^KX.*(?:OLYMPICS|TRACK|SWIM)/i,
    subcategories: ["Olympics"],
  },

  // Economics - Fed/Central Bank
  {
    category: "Economics",
    pattern: /^KX.*(?:FED|FOMC|FEDRATE|FEDDECISION)/i,
    subcategories: ["Fed Decision"],
  },

  // Economics - Inflation
  {
    category: "Economics",
    pattern: /^KX.*(?:CPI|INFLATION|PCE)/i,
    subcategories: ["Inflation"],
  },

  // Economics - GDP/Growth
  {
    category: "Economics",
    pattern: /^KX.*(?:GDP|GROWTH)/i,
    subcategories: ["GDP"],
  },

  // Economics - Employment
  {
    category: "Economics",
    pattern: /^KX.*(?:JOBS|JOBLESS|UNEMPLOYMENT|NONFARM|NFP|PAYROLL)/i,
    subcategories: ["Employment"],
  },

  // Economics - Other Indicators
  {
    category: "Economics",
    pattern: /^KX.*(?:RETAIL|HOUSING|ISM|PMI|TRADE)/i,
    subcategories: ["Economic Indicators"],
  },

  // Politics - Elections
  {
    category: "Politics",
    pattern: /^KX.*(?:ELECTION|PRESIDENT|POTUS|PRES[0-9]+)/i,
    subcategories: ["Presidential"],
  },
  {
    category: "Politics",
    pattern: /^KX.*(?:CONGRESS|SENATE|HOUSE|GOV)/i,
    subcategories: ["Congressional"],
  },
  {
    category: "Politics",
    pattern: /^KX.*(?:PRIMARY|CAUCUS|VOTE)/i,
    subcategories: ["Primary"],
  },
  {
    category: "Politics",
    pattern: /^KX.*(?:IMPEACH|SCOTUS|SUPREME)/i,
    subcategories: ["Government"],
  },

  // Weather
  {
    category: "Weather",
    pattern: /^KX.*(?:WEATHER|TEMP|TEMPERATURE|HURRICANE|STORM)/i,
    subcategories: ["Temperature", "Storms"],
  },

  // Cryptocurrency
  {
    category: "Crypto",
    pattern: /^KX.*(?:BTC|BITCOIN|ETH|ETHEREUM|CRYPTO)/i,
    subcategories: ["Bitcoin", "Ethereum"],
  },

  // Entertainment
  {
    category: "Entertainment",
    pattern: /^KX.*(?:OSCAR|EMMY|GRAMMY|AWARD)/i,
    subcategories: ["Awards"],
  },
  {
    category: "Entertainment",
    pattern: /^KX.*(?:MOVIE|BOXOFFICE|TV|STREAMING)/i,
    subcategories: ["Box Office", "TV"],
  },
];

// ============================================================================
// DATE EXTRACTION
// ============================================================================

/**
 * Month name to number mapping
 */
const MONTH_MAP: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

/**
 * Extract event date from symbol
 *
 * Patterns:
 * - YYMONDD: 25SEP04 = September 4, 2025
 * - YYMON: 25SEP = September 2025
 * - MONDD: SEP04 = September 4 (current or next year)
 */
export function extractEventDate(symbol: string): Date | null {
  // Pattern 1: YYMONDD (e.g., 25SEP04)
  const yyMonDdMatch = symbol.match(
    /(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2})/i
  );
  if (yyMonDdMatch) {
    const [, yearStr, monthStr, dayStr] = yyMonDdMatch;
    const year = 2000 + parseInt(yearStr);
    const month = MONTH_MAP[monthStr.toUpperCase()];
    const day = parseInt(dayStr);

    if (month && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day);
    }
  }

  // Pattern 2: YYMON (e.g., 25SEP)
  const yyMonMatch = symbol.match(
    /(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?!\d)/i
  );
  if (yyMonMatch) {
    const [, yearStr, monthStr] = yyMonMatch;
    const year = 2000 + parseInt(yearStr);
    const month = MONTH_MAP[monthStr.toUpperCase()];

    if (month) {
      // Return first day of month
      return new Date(year, month - 1, 1);
    }
  }

  return null;
}

/**
 * Format event date to ISO string
 */
export function formatEventDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ============================================================================
// SYMBOL PARSING
// ============================================================================

/**
 * Extract exchange prefix from symbol
 */
export function extractExchange(symbol: string): string | null {
  const match = symbol.match(/^([A-Z]{2,4})/);
  return match ? match[1] : null;
}

/**
 * Extract event type from symbol
 */
export function extractEventType(symbol: string): string | null {
  // Remove exchange prefix
  const withoutExchange = symbol.replace(/^[A-Z]{2,4}/, "");

  // Extract event type (before first dash or date)
  const match = withoutExchange.match(/^([A-Z]+)/i);
  return match ? match[1] : null;
}

/**
 * Extract participants (teams, candidates, etc.) from symbol
 */
export function extractParticipants(symbol: string): string[] {
  const parts = symbol.split("-");

  // Participants are usually in the last part(s)
  if (parts.length >= 2) {
    // Last part is often the specific outcome
    const lastPart = parts[parts.length - 1];

    // Check if it looks like a team/participant code
    if (/^[A-Z]{2,5}$/i.test(lastPart)) {
      return [lastPart.toUpperCase()];
    }

    // For matchups, might have format like "TEAMATEAMB"
    const matchup = parts[parts.length - 2] ?? "";
    const teams: string[] = [];

    // Try to split matchup into teams
    const teamMatch = matchup.match(/([A-Z]{2,5})([A-Z]{2,5})$/i);
    if (teamMatch) {
      teams.push(teamMatch[1].toUpperCase(), teamMatch[2].toUpperCase());
    }

    if (teams.length > 0) {
      teams.push(lastPart.toUpperCase());
      return teams;
    }

    return [lastPart.toUpperCase()];
  }

  return [];
}

/**
 * Categorize a symbol
 */
export function categorizeSymbol(symbol: string): MarketCategory {
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(symbol)) {
      return category;
    }
  }
  return "Other";
}

/**
 * Get subcategory for a symbol
 */
export function getSubcategory(symbol: string): string | null {
  for (const { pattern, subcategories } of CATEGORY_PATTERNS) {
    if (pattern.test(symbol) && subcategories && subcategories.length > 0) {
      return subcategories[0];
    }
  }
  return null;
}

/**
 * Parse a full symbol string into structured data
 */
export function parseSymbol(symbol: string): ParsedSymbol {
  const category = categorizeSymbol(symbol);
  const exchange = extractExchange(symbol);
  const eventType = extractEventType(symbol);
  const eventDate = extractEventDate(symbol);
  const participants = extractParticipants(symbol);

  return {
    raw: symbol,
    category,
    exchange: exchange ?? undefined,
    eventType: eventType ?? undefined,
    eventDate: eventDate ? formatEventDate(eventDate) : undefined,
    participants: participants.length > 0 ? participants : undefined,
  };
}

// ============================================================================
// SYMBOL UTILITIES
// ============================================================================

/**
 * Extract base event symbol (without specific outcome)
 *
 * Example:
 * KXNFLGAME-25SEP04DALPHI-PHI -> KXNFLGAME-25SEP04DALPHI
 */
export function getBaseSymbol(symbol: string): string {
  const parts = symbol.split("-");
  if (parts.length > 2) {
    return parts.slice(0, -1).join("-");
  }
  return symbol;
}

/**
 * Check if two symbols are for the same event but different outcomes
 */
export function isSameEvent(symbol1: string, symbol2: string): boolean {
  return getBaseSymbol(symbol1) === getBaseSymbol(symbol2);
}

/**
 * Extract the outcome from a symbol (usually the last part)
 */
export function getOutcome(symbol: string): string | null {
  const parts = symbol.split("-");
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }
  return null;
}

/**
 * Check if symbol is for a binary market (YES/NO outcome only)
 */
export function isBinaryMarket(symbol: string): boolean {
  // Most Kalshi markets are binary
  // Multi-outcome markets might have specific patterns
  return !symbol.includes("RANGE") && !symbol.includes("MULTI");
}

/**
 * Get human-readable event description from symbol
 */
export function getEventDescription(symbol: string): string {
  const parsed = parseSymbol(symbol);
  const parts: string[] = [];

  if (parsed.category !== "Other") {
    parts.push(parsed.category);
  }

  if (parsed.eventType) {
    // Convert camelCase to spaces
    const eventType = parsed.eventType
      .replace(/([A-Z])/g, " $1")
      .trim()
      .toLowerCase();
    parts.push(eventType);
  }

  if (parsed.eventDate) {
    parts.push(`(${parsed.eventDate})`);
  }

  if (parsed.participants && parsed.participants.length > 0) {
    parts.push(`- ${parsed.participants.join(" vs ")}`);
  }

  return parts.join(" ") || symbol;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Group symbols by category
 */
export function groupByCategory(
  symbols: string[]
): Map<MarketCategory, string[]> {
  const groups = new Map<MarketCategory, string[]>();

  for (const symbol of symbols) {
    const category = categorizeSymbol(symbol);
    const existing = groups.get(category) ?? [];
    existing.push(symbol);
    groups.set(category, existing);
  }

  return groups;
}

/**
 * Get category statistics from a list of symbols
 */
export function getCategoryStats(
  symbols: string[]
): { category: MarketCategory; count: number; percentage: number }[] {
  const groups = groupByCategory(symbols);
  const total = symbols.length;

  const stats: { category: MarketCategory; count: number; percentage: number }[] = [];

  for (const [category, items] of groups) {
    stats.push({
      category,
      count: items.length,
      percentage: total > 0 ? (items.length / total) * 100 : 0,
    });
  }

  // Sort by count descending
  return stats.sort((a, b) => b.count - a.count);
}
