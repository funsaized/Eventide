"use client";

import { DollarSign } from "lucide-react";
import { Tile } from "../tile";
import { TileHeader } from "../tile-header";
import { TileValue } from "../tile-value";

interface TradingProfitTileProps {
  /** Total account performance (realized + unrealized, after fees) */
  value: number;
  /** Gross P&L before fees (Section 5 source of truth) */
  grossProfit?: number;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Trading Profit tile showing total account performance
 * (realized P&L + unrealized P&L, after fees).
 */
export function TradingProfitTile({
  value,
  grossProfit,
  isLoading,
}: TradingProfitTileProps) {
  if (isLoading) {
    return (
      <Tile>
        <TileHeader
          title="Trading Profit"
          tooltip="Total account performance: Realized P&L + Unrealized P&L (after fees)"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
      </Tile>
    );
  }

  return (
    <Tile>
      <TileHeader
        title="Trading Profit"
        tooltip="Total account performance: Realized P&L + Unrealized P&L (after fees)"
        icon={<DollarSign className="h-4 w-4" />}
      />
      <TileValue
        value={value}
        format="currency"
        className="mt-2"
      />
      {grossProfit !== undefined && (
        <p className="mt-1 text-xs text-muted-foreground">
          ${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} gross
        </p>
      )}
    </Tile>
  );
}
