"use client";

/**
 * Custom Chart Tooltip
 *
 * Styled tooltip for Recharts that matches the design system.
 */

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name?: string;
    dataKey?: string;
    color?: string;
  }>;
  label?: string;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number, name?: string) => string;
  className?: string;
}

/**
 * Default percentage formatter
 */
export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/**
 * Custom tooltip component for Recharts
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = formatCurrency,
  className,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const formattedLabel = labelFormatter ? labelFormatter(label ?? "") : label;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-popover px-3 py-2 shadow-md",
        className
      )}
    >
      {formattedLabel && (
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {formattedLabel}
        </p>
      )}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          {entry.color && (
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
          )}
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {valueFormatter(entry.value, entry.name)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Simple tooltip for sparklines (value only)
 */
export function SparklineTooltip({
  active,
  payload,
  valueFormatter = formatCurrency,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded border border-border bg-popover px-2 py-1 shadow-sm">
      <span className="text-xs font-medium text-foreground tabular-nums">
        {valueFormatter(payload[0].value)}
      </span>
    </div>
  );
}

export { formatCurrency };
export type { ChartTooltipProps };
