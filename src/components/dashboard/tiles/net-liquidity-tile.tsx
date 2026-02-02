"use client";

import { Wallet } from "lucide-react";
import { Tile } from "../tile";
import { TileHeader } from "../tile-header";
import { TileValue } from "../tile-value";
import { TileTrend } from "../tile-trend";

interface NetLiquidityTileProps {
  /** Current net liquidity value */
  value: number;
  /** Percentage change this month */
  changePercent?: number;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Net Liquidity tile - the primary KPI showing total account value.
 */
export function NetLiquidityTile({
  value,
  changePercent = 0,
  isLoading,
}: NetLiquidityTileProps) {
  if (isLoading) {
    return (
      <Tile variant="primary">
        <TileHeader
          title="Net Liquidity"
          tooltip="Your total account value including open positions"
          icon={<Wallet className="h-4 w-4" />}
        />
        <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-20 animate-pulse rounded bg-muted" />
      </Tile>
    );
  }

  return (
    <Tile variant="primary">
      <TileHeader
        title="Net Liquidity"
        tooltip="Your total account value including open positions"
        icon={<Wallet className="h-4 w-4" />}
      />
      <TileValue
        value={value}
        format="currency"
        color="neutral"
        className="mt-2"
      />
      <TileTrend
        value={changePercent}
        label="this month"
        className="mt-1"
      />
    </Tile>
  );
}
