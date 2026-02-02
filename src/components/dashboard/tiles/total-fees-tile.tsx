"use client";

import { Receipt } from "lucide-react";
import { Tile } from "../tile";
import { TileHeader } from "../tile-header";
import { TileValue } from "../tile-value";

interface TotalFeesTileProps {
  /** Total fees paid */
  value: number;
  /** Fees as percentage of trading volume */
  feePercent?: number;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Total Fees tile showing cumulative trading fees.
 */
export function TotalFeesTile({
  value,
  feePercent,
  isLoading,
}: TotalFeesTileProps) {
  if (isLoading) {
    return (
      <Tile>
        <TileHeader
          title="Total Fees"
          tooltip="Cumulative commissions and exchange fees"
          icon={<Receipt className="h-4 w-4" />}
        />
        <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-20 animate-pulse rounded bg-muted" />
      </Tile>
    );
  }

  return (
    <Tile>
      <TileHeader
        title="Total Fees"
        tooltip="Cumulative commissions and exchange fees"
        icon={<Receipt className="h-4 w-4" />}
      />
      <TileValue
        value={-Math.abs(value)}
        format="currency"
        color="loss"
        className="mt-2"
      />
      {feePercent !== undefined && (
        <p className="mt-1 text-xs text-muted-foreground">
          {feePercent.toFixed(2)}% of volume
        </p>
      )}
    </Tile>
  );
}
