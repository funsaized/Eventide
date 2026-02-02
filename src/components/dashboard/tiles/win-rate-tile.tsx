"use client";

import { Target } from "lucide-react";
import { Tile } from "../tile";
import { TileHeader } from "../tile-header";
import { TileValue } from "../tile-value";

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
export function WinRateTile({
  value,
  wins = 0,
  losses = 0,
  isLoading,
}: WinRateTileProps) {
  if (isLoading) {
    return (
      <Tile>
        <TileHeader
          title="Win Rate"
          tooltip="Percentage of trades closed with profit"
          icon={<Target className="h-4 w-4" />}
        />
        <div className="mt-2 h-8 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
      </Tile>
    );
  }

  // Determine color based on win rate
  const getWinRateColor = (rate: number): "profit" | "loss" | "neutral" => {
    if (rate >= 55) return "profit";
    if (rate < 45) return "loss";
    return "neutral";
  };

  return (
    <Tile>
      <TileHeader
        title="Win Rate"
        tooltip="Percentage of trades closed with profit"
        icon={<Target className="h-4 w-4" />}
      />
      <TileValue
        value={value}
        format="percentage"
        color={getWinRateColor(value)}
        decimals={1}
        className="mt-2"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="text-profit">{wins}W</span>
        {" / "}
        <span className="text-loss">{losses}L</span>
        {" by trade count"}
      </p>
    </Tile>
  );
}
