"use client";

import {
  NetLiquidityTile,
  RealizedPnlTile,
  UnrealizedPnlTile,
  TotalFeesTile,
  TradingProfitTile,
  WinRateTile,
} from "@/components/dashboard";
import type { SparklineDataPoint } from "@/components/charts";

/** Props for dashboard tile data */
interface DashboardData {
  netLiquidity: number | null;
  netLiquidityChange?: number;
  netLiquidityHistory?: SparklineDataPoint[];
  realizedPnl: number;
  tradesClosed: number;
  unrealizedPnl: number;
  openPositions?: number;
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

/**
 * Dashboard grid displaying all portfolio metric tiles.
 * Responsive layout: 4 columns on desktop, 2 on tablet, 1 on mobile.
 */
export function DashboardGrid({ data, isLoading = false }: DashboardGridProps) {
  return (
    <section aria-labelledby="portfolio-overview">
      <h2 id="portfolio-overview" className="sr-only">
        Portfolio Overview
      </h2>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <NetLiquidityTile
          value={data?.netLiquidity ?? 0}
          changePercent={data?.netLiquidityChange}
          sparklineData={data?.netLiquidityHistory}
          isLoading={isLoading}
        />
        <RealizedPnlTile
          value={data?.realizedPnl ?? 0}
          tradesClosed={data?.tradesClosed ?? 0}
          isLoading={isLoading}
        />
        <UnrealizedPnlTile
          value={data?.unrealizedPnl ?? 0}
          openPositions={data?.openPositions ?? 0}
          isLoading={isLoading}
        />
        <WinRateTile
          value={data?.winRate ?? 0}
          wins={data?.wins ?? 0}
          losses={data?.losses ?? 0}
          isLoading={isLoading}
        />
        <TotalFeesTile
          value={data?.totalFees ?? 0}
          feePercent={data?.feePercent}
          isLoading={isLoading}
        />
        <TradingProfitTile
          value={data?.tradingProfit ?? 0}
          grossProfit={data?.grossProfit}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}

export type { DashboardData, DashboardGridProps };
