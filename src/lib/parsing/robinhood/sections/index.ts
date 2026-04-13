/**
 * Section Parsers
 *
 * Exports all section parsing utilities for Robinhood Derivatives statements.
 */

// Section boundary detection
export {
  SECTION_DEFINITIONS,
  detectSectionBoundaries,
  getSection,
  getSectionItems,
  hasSection,
  validateRequiredSections,
  matchesSectionHeader,
  isWithinSection,
  isMultiPageSection,
  getSectionPages,
  type SectionId,
  type SectionBoundary,
  type BoundaryDetectionResult,
} from "./boundaries";

// Column calibration
export {
  SECTION2_COLUMNS,
  SECTION3_COLUMNS,
  SECTION5_COLUMNS,
  SECTION6_COLUMNS,
  SECTION7_COLUMNS,
  SECTION8_COLUMNS,
  SECTION10_FIELD_PATTERNS,
  findHeaderRow,
  calibrateColumns,
  assignToColumn,
  getColumn,
  groupIntoRows,
  parseRowToColumns,
  isDataRow,
  isRepeatedHeader,
  type ColumnConfig,
} from "./columns";

// Section 2: Monthly Trade Confirmations
export {
  parseSection2,
  getTradeQuantity,
  isOpeningTrade,
  isSettlement,
  getSettlementOutcome,
  isSamePosition,
  filterByTradeType,
  filterBySymbol,
  groupTradesBySymbol,
  type TradeConfirmation,
  type TradeType,
  type Section2ParseResult,
} from "./section2";

// Section 3: Trade Confirmation Summary
export {
  parseSection3,
  getFeesForSymbolDate,
  getTotalFeesForSymbol,
  getTotalFees as getSection3TotalFees,
  groupBySymbol as groupSection3BySymbol,
  groupBySymbolAndDate,
  getFeeBreakdown,
  type TradeConfirmationSummary,
  type Section3ParseResult,
} from "./section3";

// Section 4: Purchase and Sale
export {
  parseSection4,
  areTradesDuplicate,
  mergeTradesWithDeduplication,
  getUniqueTradesFromSections,
  type PurchaseSaleTrade,
  type Section4ParseResult,
} from "./section4";

// Section 5: Purchase and Sale Summary
export {
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
} from "./section5";

// Section 6: Journal Entries
export {
  parseSection6,
  classifyCashFlow,
  inferCashFlowType,
  toJournalEntry,
  getTotalDeposits,
  getTotalWithdrawals,
  getTotalFees as getSection6TotalFees,
  getNetCashActivity,
  filterByType,
  filterByDateRange,
  groupByType,
  type CashFlowType,
  type JournalEntryRow,
  type Section6ParseResult,
} from "./section6";

// Section 7: Open Positions
export {
  parseSection7,
  toOpenPositionRow,
  getTotalOpenQuantity,
  getTotalUnrealizedPnl,
  getTotalMarketValue,
  getPositionQuantity,
  filterBySymbol as filterPositionsBySymbol,
  filterBySide,
  groupBySymbol as groupPositionsBySymbol,
  isExpiringSoon,
  type OpenPosition,
  type Section7ParseResult,
} from "./section7";

// Section 10: Account Summary
export {
  parseSection10,
  toAccountSummary,
  extractStatementMetadata,
  hasRequiredFields,
  validateSummaryConsistency,
  getTotalFees as getAccountTotalFees,
  getNetPnl,
  type AccountSummaryRaw,
  type Section10ParseResult,
} from "./section10";

// Parse helpers and logging
export {
  parseLogger,
  setDebugLogging,
  parseDateToISO,
  parseQuantity,
  parseTradePrice,
  parseCurrencyValue,
  parseTradeSide,
  parseTradeType,
  type LogLevel,
} from "./parse-helpers";
