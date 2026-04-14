/**
 * Calculations Module
 *
 * Exports all calculation utilities for P&L computation,
 * FIFO cost basis, fee attribution, and validation.
 */

// FIFO Cost Basis Calculation
export {
  PositionLedger,
  calculateFifo,
  calculateAllPositions,
  aggregateBySymbol,
  getTotalPnl,
  getWinLossStats,
  type TradeEntry,
  type PositionLot,
  type ClosedLot,
  type FifoResult,
} from "./fifo";

// P&L Validation
export {
  PNL_TOLERANCE,
  validatePosition,
  validatePnlAgainstSection5,
  quickValidateTotals,
  analyzeDiscrepancy,
  generateDiscrepancyReport,
  createReconciliationRecord,
  shouldBlockImport,
  type PositionValidation,
  type ValidationResult as PnlValidationResult,
  type DiscrepancyCause,
  type ReportedPosition,
} from "./validation";

// Fee Attribution
export {
  attributeFees,
  validateFeeAttribution,
  initializeTradeWithFees,
  getTotalTradesFees,
  getTradesFeeBreakdown,
  getUnattributedTrades,
  calculateFeeRate,
  type TradeWithFees,
  type FeeAttributionResult,
  type FeeSummary,
} from "./fee-attribution";
