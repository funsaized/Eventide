"use client";

/**
 * PnLBadge - Displays profit/loss with color coding
 *
 * Green for positive, red for negative, muted for null/zero.
 */

import { cn } from "@/lib/utils";

interface PnLBadgeProps {
  /** P&L value in dollars, null for open positions */
  value: number | null;
  className?: string;
}

/**
 * Format a dollar value with sign prefix
 */
function formatPnL(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}$${Math.abs(value).toFixed(2)}`;
}

export function PnLBadge({ value, className }: PnLBadgeProps) {
  if (value === null) {
    return (
      <span
        className={cn(
          "font-mono text-sm tabular-nums text-muted-foreground",
          className
        )}
      >
        —
      </span>
    );
  }

  return (
    <span
      className={cn(
        "font-mono text-sm tabular-nums font-medium",
        value > 0 && "text-profit",
        value < 0 && "text-loss",
        value === 0 && "text-muted-foreground",
        className
      )}
    >
      {formatPnL(value)}
    </span>
  );
}

export type { PnLBadgeProps };
