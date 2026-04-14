/**
 * Database query barrel exports.
 */

// Statement queries
export {
  generateId,
  getStatementImports,
  getStatementImportById,
  getStatementImportByKey,
  checkDuplicateImport,
  createStatementImport,
  deleteStatementImport,
  getLatestStatementImport,
  getStatementImportsByDateRange,
  getStatementImportCount,
  replaceStatementImport,
} from "./statements";

// Trade queries
export {
  getTrades,
  getTradeById,
  getTradesByImportId,
  getTradesPaginated,
  getFilteredTrades,
  createTrade,
  createTrades,
  deleteTrade,
  deleteTradesByImportId,
  getUniqueCategories,
  getUniqueSymbols,
  getTradeCountByCategory,
  getTradeCount,
  getTradesForJournal,
  getPositionsForJournal,
  getPositionJournalTotals,
  getTradesForPosition,
} from "./trades";

// Query utilities
export {
  TRADE_LIST_SORT_FIELDS,
  TRADE_SORT_FIELDS,
  POSITION_SORT_FIELDS,
  TRADE_JOURNAL_SORT_FIELDS,
  POSITION_JOURNAL_SORT_FIELDS,
  TRADE_INSERT_SQL,
  CLOSED_POSITION_INSERT_SQL,
  OPEN_POSITION_INSERT_SQL,
  CASH_FLOW_INSERT_SQL,
  buildSortClause,
  buildFilterWhereClauses,
  TRADE_INSERT_PARAMS,
  CLOSED_POSITION_INSERT_PARAMS,
  OPEN_POSITION_INSERT_PARAMS,
  CASH_FLOW_INSERT_PARAMS,
} from "./query-utils";

// Position queries
export {
  getClosedPositions,
  getClosedPositionById,
  getClosedPositionsByImportId,
  getClosedPositionsBySymbol,
  getClosedPositionsByDateRange,
  createClosedPosition,
  createClosedPositions,
  getTotalRealizedPnL as getPositionsTotalRealizedPnL,
  getWinRateByCount as getPositionsWinRateByCount,
  getWinRateByVolume as getPositionsWinRateByVolume,
  getCurrentOpenPositions,
  getOpenPositionsBySnapshotDate,
  createOpenPosition,
  createOpenPositions,
  getTotalUnrealizedPnL as getPositionsTotalUnrealizedPnL,
  getCashFlows,
  getCashFlowsByImportId,
  createCashFlow,
  createCashFlows,
  getTotalDeposits,
  getTotalWithdrawals,
  getNetCashFlow,
} from "./positions";

// Dashboard queries
export {
  getPortfolioSnapshot,
  getCurrentNetLiquidity,
  getNetLiquidityHistory,
  getTotalRealizedPnL,
  getTotalUnrealizedPnL,
  getTotalFees,
  getTradingProfit,
  getWinRateByCount,
  getWinRateByVolume,
  getWinLossCounts,
  getMonthlyPerformance,
  getMonthlyPerformanceChart,
  getCategoryPerformance,
  getCategoryPerformanceChart,
  getVolumeByCategory,
  getMonthlyFees,
  getMonthlyFeesWithCumulative,
  getFeeDragPercentage,
  getDashboardSummary,
  getLatestImportDate,
  hasData,
} from "./dashboard";
