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
 * Get total realized P&L
 */
export async function getTotalRealizedPnL(): Promise<number> {
  const results = await query<{ total: number | null }>(
    `SELECT SUM(net_pnl) as total FROM closed_positions`
  );
  return results[0]?.total ?? 0;
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
 */
export async function getTotalFees(): Promise<number> {
  // Sum fees from closed positions and trades
  const results = await query<{ total: number | null }>(
    `SELECT SUM(fees) as total FROM closed_positions`
  );
  return results[0]?.total ?? 0;
}

/**
 * Get trading profit (net liquidity - net deposits)
 */
export async function getTradingProfit(): Promise<number> {
  const snapshot = await getPortfolioSnapshot();
  if (!snapshot) return 0;

  const netDeposits =
    (snapshot.total_deposits ?? 0) - Math.abs(snapshot.total_withdrawals ?? 0);
  const netLiquidity = snapshot.current_net_liquidity ?? 0;

  return netLiquidity - netDeposits;
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
 */
export async function getFeeDragPercentage(): Promise<number> {
  const results = await query<{ drag: number | null }>(
    `SELECT
      CASE
        WHEN SUM(ABS(gross_pnl)) > 0
        THEN SUM(fees) / SUM(ABS(gross_pnl)) * 100
        ELSE 0
      END as drag
     FROM closed_positions`
  );
  return results[0]?.drag ?? 0;
}

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

/**
 * Get all dashboard data in one call (optimized)
 */
export async function getDashboardSummary(): Promise<{
  netLiquidity: number | null;
  realizedPnL: number;
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
}> {
  // Execute queries in parallel where possible
  const [
    netLiquidity,
    realizedPnL,
    unrealizedPnL,
    totalFees,
    winRateByCount,
    winRateByVolume,
    feeDragPercent,
    snapshot,
    tradeCount,
    positionCount,
  ] = await Promise.all([
    getCurrentNetLiquidity(),
    getTotalRealizedPnL(),
    getTotalUnrealizedPnL(),
    getTotalFees(),
    getWinRateByCount(),
    getWinRateByVolume(),
    getFeeDragPercentage(),
    getPortfolioSnapshot(),
    query<{ count: number }>(`SELECT COUNT(*) as count FROM trades`),
    query<{ count: number }>(`SELECT COUNT(*) as count FROM closed_positions`),
  ]);

  const totalDeposits = snapshot?.total_deposits ?? 0;
  const totalWithdrawals = snapshot?.total_withdrawals ?? 0;
  const netDeposits = totalDeposits - Math.abs(totalWithdrawals);
  const tradingProfit = (netLiquidity ?? 0) - netDeposits;

  return {
    netLiquidity,
    realizedPnL,
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
