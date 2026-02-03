"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardGrid, type DashboardData } from "@/features/dashboard";
import { TimeSeriesChart } from "@/components/charts";
import { EmptyState } from "@/components/feedback";
import { ChartSkeleton } from "@/components/feedback";
import { useDashboardData, useWinLossCounts } from "@/hooks/use-dashboard-data";
import { format, parseISO } from "date-fns";

/**
 * Calculate percentage change between latest and previous month
 */
function calculateMonthlyChange(
  history: { date: string; value: number }[]
): number | undefined {
  if (history.length < 2) return undefined;

  const current = history[history.length - 1].value;
  const previous = history[history.length - 2].value;

  if (previous === 0) return undefined;

  return ((current - previous) / Math.abs(previous)) * 100;
}

export default function DashboardPage() {
  const {
    isLoading,
    hasData,
    summary,
    netLiquidityHistory,
    latestImportDate,
  } = useDashboardData();

  const { data: winLossCounts } = useWinLossCounts();

  // Show empty state if no data and not loading
  if (!isLoading && !hasData) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <EmptyState variant="dashboard" />
      </div>
    );
  }

  // Transform net liquidity history to sparkline format
  const sparklineData = netLiquidityHistory.map((item) => ({
    value: item.value,
    date: item.date,
  }));

  // Calculate monthly change
  const netLiquidityChange = calculateMonthlyChange(netLiquidityHistory);

  // Build dashboard data from summary
  const dashboardData: DashboardData | undefined = summary
    ? {
        netLiquidity: summary.netLiquidity,
        netLiquidityChange,
        netLiquidityHistory: sparklineData,
        realizedPnl: summary.realizedPnL,
        tradesClosed: summary.positionCount,
        unrealizedPnl: summary.unrealizedPnL,
        totalFees: summary.totalFees,
        feePercent: summary.feeDragPercent,
        tradingProfit: summary.tradingProfit,
        grossProfit: summary.realizedPnL,
        winRate: summary.winRateByCount * 100,
        wins: winLossCounts?.wins ?? 0,
        losses: winLossCounts?.losses ?? 0,
      }
    : undefined;

  // Format "as of" date
  const asOfDate = latestImportDate
    ? format(parseISO(latestImportDate), "MMMM yyyy")
    : undefined;

  return (
    <div className="space-y-6">
      {/* Portfolio Overview Tiles */}
      <DashboardGrid data={dashboardData} isLoading={isLoading} />

      {/* Net Liquidity Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Net Liquidity Over Time</CardTitle>
            {asOfDate && (
              <span className="text-sm text-muted-foreground">
                As of {asOfDate}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton height={256} className="border-0" />
          ) : netLiquidityHistory.length > 0 ? (
            <TimeSeriesChart
              data={netLiquidityHistory}
              height={256}
              variant="primary"
              showGrid
              showArea
              ariaLabel="Net liquidity trend over time"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Import more statements to see your net liquidity trend
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
