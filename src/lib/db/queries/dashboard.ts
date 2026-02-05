/**
 * Dashboard Queries
 *
 * Queries optimized for dashboard tiles and charts.
 */

import { query } from "../client";
import type {
  MonthlyPerformance,
  CategoryPerformance,
  PortfolioSnapshot,
  StatementImport,
} from "../types";

// ============================================================================
// PORTFOLIO OVERVIEW
// ============================================================================

/**
 * Get the portfolio snapshot view data
 */
export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot | null> {
  const results = await query<PortfolioSnapshot>(
    `SELECT * FROM portfolio_snapshot`
  );
  return results[0] ?? null;
}

/**
 * Get current net liquidity from the latest statement
 */
export async function getCurrentNetLiquidity(): Promise<number | null> {
  const results = await query<{ net_liquidity: number | null }>(
    `SELECT net_liquidity FROM statement_imports
     ORDER BY statement_date DESC
     LIMIT 1`
  );
  return results[0]?.net_liquidity ?? null;
}

/**
 * Get net liquidity over time (for time series chart)
 */
export async function getNetLiquidityHistory(): Promise<
  { date: string; value: number }[]
> {
  const results = await query<{ date: string; value: number }>(
    `SELECT statement_date as date, net_liquidity as value
     FROM statement_imports
     WHERE net_liquidity IS NOT NULL
     ORDER BY statement_date ASC`
  );
  return results;
}

/**
 * Get total realized P&L (gross P&L minus fees)
 * Uses gross_pnl from closed_positions + authoritative fees from statement_imports
 * so that realized P&L is accurate even when Section 3 fee attribution is incomplete.
 */
export async function getTotalRealizedPnL(): Promise<number> {
  const grossResult = await query<{ total: number | null }>(
    `SELECT SUM(gross_pnl) as total FROM closed_positions`
  );
  const grossPnl = grossResult[0]?.total ?? 0;

  // Section 10 total_fees is stored as negative (expense)
  const feeResult = await query<{ total: number | null }>(
    `SELECT SUM(total_fees) as total FROM statement_imports WHERE total_fees IS NOT NULL`
  );
  const totalFees = feeResult[0]?.total ?? 0;

  // gross_pnl + total_fees (both can be negative, addition is correct)
  // e.g., -133.98 + (-114.64) = -248.62
  return grossPnl + totalFees;
}

/**
 * Get total unrealized P&L (from latest snapshot)
 */
export async function getTotalUnrealizedPnL(): Promise<number> {
  const results = await query<{ total: number | null }>(
    `SELECT SUM(unrealized_pnl) as total
     FROM open_positions
     WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM open_positions)`
  );
  return results[0]?.total ?? 0;
}

/**
 * Get total fees paid
 * Uses Section 10 (Account Summary) total as the authoritative source.
 * Section 10 stores fees as negative values (expenses), so we return
 * the absolute value for display.
 */
export async function getTotalFees(): Promise<number> {
  const statementFees = await query<{ total: number | null }>(
    `SELECT SUM(total_fees) as total FROM statement_imports WHERE total_fees IS NOT NULL`
  );
  const section10Total = statementFees[0]?.total ?? 0;

  // Section 10 stores fees as negative; return absolute value
  if (section10Total !== 0) {
    return Math.abs(section10Total);
  }

  // Fallback: sum of attributed fees on closed positions
  const results = await query<{ total: number | null }>(
    `SELECT SUM(fees) as total FROM closed_positions`
  );
  return results[0]?.total ?? 0;
}

/**
 * Get trading profit (total account performance: realized + unrealized)
 * Realized P&L already includes fees (gross P&L from Section 5 + fees from Section 10).
 */
export async function getTradingProfit(): Promise<number> {
  const realizedPnL = await getTotalRealizedPnL();
  const unrealizedPnL = await getTotalUnrealizedPnL();
  return realizedPnL + unrealizedPnL;
}

// ============================================================================
// WIN RATE METRICS
// ============================================================================

/**
 * Get win rate by count (percentage of winning trades)
 */
export async function getWinRateByCount(): Promise<number> {
  const results = await query<{ win_rate: number | null }>(
    `SELECT
      CASE
        WHEN COUNT(*) > 0
        THEN CAST(SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)
        ELSE 0
      END as win_rate
     FROM closed_positions`
  );
  return results[0]?.win_rate ?? 0;
}

/**
 * Get win rate by volume (dollar-weighted)
 */
export async function getWinRateByVolume(): Promise<number> {
  const results = await query<{ win_rate: number | null }>(
    `SELECT
      CASE
        WHEN SUM(ABS(net_pnl)) > 0
        THEN SUM(CASE WHEN net_pnl > 0 THEN ABS(net_pnl) ELSE 0 END) / SUM(ABS(net_pnl))
        ELSE 0
      END as win_rate
     FROM closed_positions`
  );
  return results[0]?.win_rate ?? 0;
}

/**
 * Get win/loss counts
 */
export async function getWinLossCounts(): Promise<{
  wins: number;
  losses: number;
  total: number;
}> {
  const results = await query<{ wins: number; losses: number; total: number }>(
    `SELECT
      SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN net_pnl <= 0 THEN 1 ELSE 0 END) as losses,
      COUNT(*) as total
     FROM closed_positions`
  );
  return results[0] ?? { wins: 0, losses: 0, total: 0 };
}

// ============================================================================
// PERFORMANCE VIEWS
// ============================================================================

/**
 * Get monthly performance data (from view)
 */
export async function getMonthlyPerformance(): Promise<MonthlyPerformance[]> {
  return query<MonthlyPerformance>(
    `SELECT * FROM monthly_performance ORDER BY month DESC`
  );
}

/**
 * Get monthly performance for chart (last N months)
 */
export async function getMonthlyPerformanceChart(
  months: number = 12
): Promise<{ month: string; pnl: number; winRate: number }[]> {
  const results = await query<{
    month: string;
    net_pnl: number;
    win_rate: number;
  }>(
    `SELECT month, net_pnl, win_rate
     FROM monthly_performance
     ORDER BY month DESC
     LIMIT ?`,
    [months]
  );

  return results.reverse().map((r) => ({
    month: r.month,
    pnl: r.net_pnl,
    winRate: r.win_rate,
  }));
}

/**
 * Get category performance data (from view)
 */
export async function getCategoryPerformance(): Promise<CategoryPerformance[]> {
  return query<CategoryPerformance>(
    `SELECT * FROM category_performance ORDER BY net_pnl DESC`
  );
}

/**
 * Get category performance for chart
 */
export async function getCategoryPerformanceChart(): Promise<
  { category: string; pnl: number; winRate: number; trades: number }[]
> {
  const results = await query<{
    category: string;
    net_pnl: number;
    win_rate_by_count: number;
    positions_closed: number;
  }>(
    `SELECT category, net_pnl, win_rate_by_count, positions_closed
     FROM category_performance
     WHERE category IS NOT NULL
     ORDER BY net_pnl DESC`
  );

  return results.map((r) => ({
    category: r.category,
    pnl: r.net_pnl,
    winRate: r.win_rate_by_count,
    trades: r.positions_closed,
  }));
}

// ============================================================================
// FEE ANALYSIS
// ============================================================================

/**
 * Get monthly fee breakdown
 */
export async function getMonthlyFees(): Promise<
  { month: string; fees: number }[]
> {
  const results = await query<{ month: string; fees: number }>(
    `SELECT
      strftime('%Y-%m', exit_date) as month,
      SUM(fees) as fees
     FROM closed_positions
     WHERE fees IS NOT NULL
     GROUP BY month
     ORDER BY month ASC`
  );
  return results;
}

/**
 * Get fee drag percentage (fees / total volume)
 * Uses Section 10 authoritative fee total for accuracy.
 */
export async function getFeeDragPercentage(): Promise<number> {
  const totalFees = await getTotalFees();
  const volumeResult = await query<{ total: number | null }>(
    `SELECT SUM(ABS(gross_pnl)) as total FROM closed_positions`
  );
  const totalVolume = volumeResult[0]?.total ?? 0;

  if (totalVolume === 0) return 0;
  return (totalFees / totalVolume) * 100;
}

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

/**
 * Get all dashboard data in one call (optimized)
 * Note: Queries run sequentially to avoid wa-sqlite WebLock contention
 */
export async function getDashboardSummary(): Promise<{
  netLiquidity: number | null;
  realizedPnL: number;
  grossPnL: number;
  unrealizedPnL: number;
  totalFees: number;
  tradingProfit: number;
  winRateByCount: number;
  winRateByVolume: number;
  feeDragPercent: number;
  totalDeposits: number;
  totalWithdrawals: number;
  tradeCount: number;
  positionCount: number;
  openPositionCount: number;
}> {
  // Execute queries sequentially to avoid wa-sqlite lock contention
  // The IndexedDB storage backend doesn't handle concurrent queries well
  const netLiquidity = await getCurrentNetLiquidity();
  const realizedPnL = await getTotalRealizedPnL();
  const unrealizedPnL = await getTotalUnrealizedPnL();
  const totalFees = await getTotalFees();
  const winRateByCount = await getWinRateByCount();
  const winRateByVolume = await getWinRateByVolume();
  const feeDragPercent = await getFeeDragPercentage();
  const snapshot = await getPortfolioSnapshot();
  const tradeCount = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM trades`
  );
  const positionCount = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM closed_positions`
  );
  // Gross P&L before fees (Section 5 source of truth)
  const grossPnLResult = await query<{ total: number | null }>(
    `SELECT SUM(gross_pnl) as total FROM closed_positions`
  );
  // Open position count from latest snapshot
  const openPositionResult = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM open_positions
     WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM open_positions)`
  );

  const totalDeposits = snapshot?.total_deposits ?? 0;
  const totalWithdrawals = snapshot?.total_withdrawals ?? 0;

  // Trading Profit = total account performance (realized + unrealized)
  // realizedPnL already includes fees (gross P&L + fees from Section 10)
  const tradingProfit = realizedPnL + unrealizedPnL;

  return {
    netLiquidity,
    realizedPnL,
    grossPnL: grossPnLResult[0]?.total ?? 0,
    unrealizedPnL,
    totalFees,
    tradingProfit,
    winRateByCount,
    winRateByVolume,
    feeDragPercent,
    totalDeposits,
    totalWithdrawals,
    tradeCount: tradeCount[0]?.count ?? 0,
    positionCount: positionCount[0]?.count ?? 0,
    openPositionCount: openPositionResult[0]?.count ?? 0,
  };
}

/**
 * Get latest import date (for "as of" display)
 */
export async function getLatestImportDate(): Promise<string | null> {
  const results = await query<StatementImport>(
    `SELECT statement_date FROM statement_imports ORDER BY statement_date DESC LIMIT 1`
  );
  return results[0]?.statement_date ?? null;
}

/**
 * Check if there is any data in the database
 */
export async function hasData(): Promise<boolean> {
  const results = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM statement_imports`
  );
  return (results[0]?.count ?? 0) > 0;
}
