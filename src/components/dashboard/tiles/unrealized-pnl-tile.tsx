"use client";

import { Clock } from "lucide-react";
import { MetricTile } from "./metric-tile";

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
  return (
    <MetricTile
      title="Unrealized P&L"
      tooltip="Paper profit/loss from positions not yet closed"
      icon={<Clock className="h-4 w-4" />}
      value={value}
      subtitle={
        <p className="text-xs text-muted-foreground">
          {openPositions} open position{openPositions !== 1 ? "s" : ""}
        </p>
      }
      isLoading={isLoading}
    />
  );
}
