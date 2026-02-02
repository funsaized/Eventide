"use client";

import {
  NetLiquidityTile,
  RealizedPnlTile,
  UnrealizedPnlTile,
  TotalFeesTile,
  TradingProfitTile,
  WinRateTile,
} from "@/components/dashboard";

/** Props for dashboard tile data (will be connected to real data in Phase 9) */
interface DashboardData {
  netLiquidity: number;
  netLiquidityChange: number;
  realizedPnl: number;
  tradesClosed: number;
  unrealizedPnl: number;
  openPositions: number;
  totalFees: number;
  feePercent?: number;
  tradingProfit: number;
  grossProfit?: number;
  winRate: number;
  wins: number;
  losses: number;
}

interface DashboardGridProps {
  /** Dashboard metrics data */
  data?: DashboardData;
  /** Whether data is loading */
  isLoading?: boolean;
}

/** Static mock data for Phase 8 */
const MOCK_DATA: DashboardData = {
  netLiquidity: 5432.1,
  netLiquidityChange: 12.5,
  realizedPnl: 1234.56,
  tradesClosed: 147,
  unrealizedPnl: -89.5,
  openPositions: 8,
  totalFees: 156.78,
  feePercent: 1.2,
  tradingProfit: 1077.78,
  grossProfit: 1234.56,
  winRate: 62.4,
  wins: 92,
  losses: 55,
};

/**
 * Dashboard grid displaying all portfolio metric tiles.
 * Responsive layout: 4 columns on desktop, 2 on tablet, 1 on mobile.
 */
export function DashboardGrid({ data, isLoading = false }: DashboardGridProps) {
  // Use mock data if no real data provided
  const displayData = data ?? MOCK_DATA;

  return (
    <section aria-labelledby="portfolio-overview">
      <h2 id="portfolio-overview" className="sr-only">
        Portfolio Overview
      </h2>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <NetLiquidityTile
          value={displayData.netLiquidity}
          changePercent={displayData.netLiquidityChange}
          isLoading={isLoading}
        />
        <RealizedPnlTile
          value={displayData.realizedPnl}
          tradesClosed={displayData.tradesClosed}
          isLoading={isLoading}
        />
        <UnrealizedPnlTile
          value={displayData.unrealizedPnl}
          openPositions={displayData.openPositions}
          isLoading={isLoading}
        />
        <WinRateTile
          value={displayData.winRate}
          wins={displayData.wins}
          losses={displayData.losses}
          isLoading={isLoading}
        />
        <TotalFeesTile
          value={displayData.totalFees}
          feePercent={displayData.feePercent}
          isLoading={isLoading}
        />
        <TradingProfitTile
          value={displayData.tradingProfit}
          grossProfit={displayData.grossProfit}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}

export type { DashboardData, DashboardGridProps };
