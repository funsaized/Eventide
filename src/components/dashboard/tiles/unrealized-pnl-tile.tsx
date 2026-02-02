"use client";

import { Clock } from "lucide-react";
import { Tile } from "../tile";
import { TileHeader } from "../tile-header";
import { TileValue } from "../tile-value";

interface UnrealizedPnlTileProps {
  /** Total unrealized P&L from open positions */
  value: number;
  /** Number of open positions */
  openPositions?: number;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Unrealized P&L tile showing paper profit/loss from open positions.
 */
export function UnrealizedPnlTile({
  value,
  openPositions = 0,
  isLoading,
}: UnrealizedPnlTileProps) {
  if (isLoading) {
    return (
      <Tile>
        <TileHeader
          title="Unrealized P&L"
          tooltip="Paper profit/loss from positions not yet closed"
          icon={<Clock className="h-4 w-4" />}
        />
        <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
      </Tile>
    );
  }

  return (
    <Tile>
      <TileHeader
        title="Unrealized P&L"
        tooltip="Paper profit/loss from positions not yet closed"
        icon={<Clock className="h-4 w-4" />}
      />
      <TileValue
        value={value}
        format="currency"
        className="mt-2"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {openPositions} open position{openPositions !== 1 ? "s" : ""}
      </p>
    </Tile>
  );
}
