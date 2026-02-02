import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type TrendDirection = "up" | "down" | "flat";

interface TileTrendProps {
  /** The trend value (e.g., percentage change) */
  value: number;
  /** Description text (e.g., "this month", "147 trades") */
  label?: string;
  /** Force a specific direction regardless of value */
  direction?: TrendDirection;
  /** Format value as percentage */
  isPercentage?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Determines the trend direction based on value.
 */
function getTrendDirection(value: number): TrendDirection {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

/**
 * Tile trend indicator showing direction with icon and value.
 */
function TileTrend({
  value,
  label,
  direction,
  isPercentage = true,
  className,
}: TileTrendProps) {
  const effectiveDirection = direction ?? getTrendDirection(value);

  const Icon = {
    up: TrendingUp,
    down: TrendingDown,
    flat: Minus,
  }[effectiveDirection];

  const colorClass = {
    up: "text-profit",
    down: "text-loss",
    flat: "text-muted-foreground",
  }[effectiveDirection];

  const formattedValue = isPercentage
    ? `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
    : value >= 0
    ? `+${value}`
    : value.toString();

  return (
    <div className={cn("flex items-center gap-1 text-xs", colorClass, className)}>
      <Icon className="h-3 w-3" />
      <span className="font-medium tabular-nums">{formattedValue}</span>
      {label && (
        <span className="text-muted-foreground ml-1">{label}</span>
      )}
    </div>
  );
}

export { TileTrend };
export type { TileTrendProps, TrendDirection };
