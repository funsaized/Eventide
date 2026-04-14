"use client";

import { Wallet } from "lucide-react";
import { TileTrend } from "../tile-trend";
import { TileSparkline } from "../tile-sparkline";
import { MetricTile } from "./metric-tile";
import type { SparklineDataPoint } from "@/components/charts";

interface NetLiquidityTileProps {
  /** Current net liquidity value */
  value: number;
  /** Percentage change this month */
  changePercent?: number;
  /** Historical data for sparkline */
  sparklineData?: SparklineDataPoint[];
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Net Liquidity tile - the primary KPI showing total account value.
 */
export function NetLiquidityTile({
  value,
  changePercent = 0,
  sparklineData,
  isLoading,
}: NetLiquidityTileProps) {
  return (
    <MetricTile
      title="Net Liquidity"
      tooltip="Your total account value including open positions"
      icon={<Wallet className="h-4 w-4" />}
      value={value}
      color="default"
      subtitle={<TileTrend value={changePercent} label="this month" />}
      isLoading={isLoading}
      variant="primary"
      loadingSubtitleClassName="w-20"
    >
      {sparklineData && sparklineData.length > 1 ? (
        <TileSparkline data={sparklineData} variant="primary" />
      ) : null}
    </MetricTile>
  );
}
