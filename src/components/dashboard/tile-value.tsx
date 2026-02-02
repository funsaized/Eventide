import * as React from "react";
import { cn } from "@/lib/utils";

type ValueFormat = "currency" | "percentage" | "number" | "compact";
type ValueColor = "default" | "profit" | "loss" | "neutral";

interface TileValueProps {
  /** The numeric value to display */
  value: number;
  /** How to format the value */
  format?: ValueFormat;
  /** Color variant based on value meaning */
  color?: ValueColor;
  /** Number of decimal places (default: 2 for currency/percentage) */
  decimals?: number;
  /** Currency code for currency format (default: USD) */
  currency?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Formats a number based on the specified format type.
 */
function formatValue(
  value: number,
  format: ValueFormat,
  decimals: number,
  currency: string
): string {
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);

    case "percentage":
      return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;

    case "compact":
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);

    case "number":
    default:
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
  }
}

/**
 * Determines color class based on color variant and value.
 */
function getColorClass(color: ValueColor, value: number): string {
  if (color === "profit") return "text-profit";
  if (color === "loss") return "text-loss";
  if (color === "neutral") return "text-foreground";
  // Default: color based on value sign
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-foreground";
}

/**
 * Tile value component with formatting options for currency, percentage, etc.
 * Uses tabular-nums for proper financial number alignment.
 */
function TileValue({
  value,
  format = "currency",
  color = "default",
  decimals = 2,
  currency = "USD",
  className,
}: TileValueProps) {
  const formattedValue = formatValue(value, format, decimals, currency);
  const colorClass = getColorClass(color, value);

  return (
    <p
      className={cn(
        "text-2xl font-bold tabular-nums tracking-tight",
        colorClass,
        className
      )}
    >
      {formattedValue}
    </p>
  );
}

export { TileValue, formatValue };
export type { TileValueProps, ValueFormat, ValueColor };
