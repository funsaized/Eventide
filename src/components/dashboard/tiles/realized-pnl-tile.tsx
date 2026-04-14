"use client";

import { TrendingUp } from "lucide-react";
import { MetricTile } from "./metric-tile";

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
  return (
    <MetricTile
      title="Realized P&L"
      tooltip="Total profit/loss from closed positions"
      icon={<TrendingUp className="h-4 w-4" />}
      value={value}
      subtitle={
        <p className="text-xs text-muted-foreground">
          {tradesClosed.toLocaleString()} trades closed
        </p>
      }
      isLoading={isLoading}
    />
  );
}
