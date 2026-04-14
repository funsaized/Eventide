"use client";

import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { MetricTile } from "./metric-tile";

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
  return (
    <MetricTile
      title="Trading Profit"
      tooltip="Total account performance: Realized P&L + Unrealized P&L (after fees)"
      icon={<DollarSign className="h-4 w-4" />}
      value={value}
      subtitle={
        grossProfit !== undefined ? (
          <p className="text-xs text-muted-foreground">
            {formatCurrency(grossProfit)} gross
          </p>
        ) : undefined
      }
      isLoading={isLoading}
    />
  );
}
