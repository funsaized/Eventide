"use client";

import { Target } from "lucide-react";
import { MetricTile } from "./metric-tile";

interface WinRateTileProps {
  /** Win rate as percentage (0-100) */
  value: number;
  /** Number of winning trades */
  wins?: number;
  /** Number of losing trades */
  losses?: number;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Win Rate tile showing percentage of profitable trades.
 */
function getWinRateColor(rate: number): "default" | "profit" | "loss" {
  if (rate >= 55) return "profit";
  if (rate < 45) return "loss";
  return "default";
}

export function WinRateTile({
  value,
  wins = 0,
  losses = 0,
  isLoading,
}: WinRateTileProps) {
  return (
    <MetricTile
      title="Win Rate"
      tooltip="Percentage of trades closed with profit"
      icon={<Target className="h-4 w-4" />}
      value={`${value.toFixed(1)}%`}
      format="raw"
      color={getWinRateColor(value)}
      subtitle={
        <p className="text-xs text-muted-foreground">
          <span className="text-profit">{wins}W</span>
          {" / "}
          <span className="text-loss">{losses}L</span>
          {" by trade count"}
        </p>
      }
      isLoading={isLoading}
      loadingValueClassName="w-20"
    />
  );
}
