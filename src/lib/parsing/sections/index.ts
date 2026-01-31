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
  SECTION5_COLUMNS,
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
