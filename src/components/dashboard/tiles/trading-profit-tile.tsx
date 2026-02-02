"use client";

import { DollarSign } from "lucide-react";
import { Tile } from "../tile";
import { TileHeader } from "../tile-header";
import { TileValue } from "../tile-value";

interface TradingProfitTileProps {
  /** Net trading profit (realized P&L minus fees) */
  value: number;
  /** Gross profit before fees */
  grossProfit?: number;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Trading Profit tile showing net profit after fees.
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
          tooltip="Net profit from trading after fees (Realized P&L - Fees)"
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
        tooltip="Net profit from trading after fees (Realized P&L - Fees)"
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
