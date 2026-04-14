"use client";

import { Receipt } from "lucide-react";
import { MetricTile } from "./metric-tile";

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
  return (
    <MetricTile
      title="Total Fees"
      tooltip="Cumulative commissions and exchange fees"
      icon={<Receipt className="h-4 w-4" />}
      value={-Math.abs(value)}
      color="loss"
      subtitle={
        feePercent !== undefined ? (
          <p className="text-xs text-muted-foreground">
            {feePercent.toFixed(2)}% of volume
          </p>
        ) : undefined
      }
      isLoading={isLoading}
      loadingSubtitleClassName="w-20"
    />
  );
}
