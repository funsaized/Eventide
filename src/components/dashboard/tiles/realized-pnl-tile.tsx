"use client";

import { TrendingUp } from "lucide-react";
import { Tile } from "../tile";
import { TileHeader } from "../tile-header";
import { TileValue } from "../tile-value";
import { TileTrend } from "../tile-trend";

interface RealizedPnlTileProps {
  /** Total realized P&L */
  value: number;
  /** Number of trades closed */
  tradesClosed?: number;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Realized P&L tile showing total profit/loss from closed positions.
 */
export function RealizedPnlTile({
  value,
  tradesClosed = 0,
  isLoading,
}: RealizedPnlTileProps) {
  if (isLoading) {
    return (
      <Tile>
        <TileHeader
          title="Realized P&L"
          tooltip="Total profit/loss from closed positions"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
      </Tile>
    );
  }

  return (
    <Tile>
      <TileHeader
        title="Realized P&L"
        tooltip="Total profit/loss from closed positions"
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <TileValue
        value={value}
        format="currency"
        className="mt-2"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {tradesClosed.toLocaleString()} trades closed
      </p>
    </Tile>
  );
}
