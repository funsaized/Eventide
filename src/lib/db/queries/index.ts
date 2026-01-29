// Statement queries
export * from "./statements";

// Trade queries
export * from "./trades";

// Position queries (closed positions, open positions, cash flows)
export {
  // Closed positions
  getClosedPositions,
  getClosedPositionById,
  getClosedPositionsByImportId,
  getClosedPositionsBySymbol,
  getClosedPositionsByDateRange,
  createClosedPosition,
  createClosedPositions,
  // Open positions
  getCurrentOpenPositions,
  getOpenPositionsBySnapshotDate,
  createOpenPosition,
  createOpenPositions,
  // Cash flows
  getCashFlows,
  getCashFlowsByImportId,
  createCashFlow,
  createCashFlows,
  getTotalDeposits,
  getTotalWithdrawals,
  getNetCashFlow,
} from "./positions";

// Dashboard queries (all exported, some overlap with positions but with dashboard-specific implementations)
export * from "./dashboard";
