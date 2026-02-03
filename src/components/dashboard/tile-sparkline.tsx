"use client";

/**
 * Tile Sparkline Component
 *
 * Sparkline wrapper optimized for dashboard tiles.
 */

import { Sparkline, type SparklineDataPoint } from "@/components/charts";
import { SparklineSkeleton } from "@/components/feedback";
import { cn } from "@/lib/utils";

interface TileSparklineProps {
  /** Data points for the sparkline */
  data?: SparklineDataPoint[];
  /** Color variant */
  variant?: "primary" | "profit" | "loss" | "neutral" | "auto";
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Whether data is loading */
  isLoading?: boolean;
  /** CSS class name */
  className?: string;
}

/**
 * Sparkline component designed for dashboard tiles
 */
export function TileSparkline({
  data,
  variant = "auto",
  width = 80,
  height = 32,
  isLoading,
  className,
}: TileSparklineProps) {
  if (isLoading) {
    return <SparklineSkeleton width={width} height={height} className={className} />;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Resolve "auto" variant based on trend
  const resolvedVariant = variant === "auto" ? undefined : variant;

  return (
    <div className={cn("mt-2", className)}>
      <Sparkline
        data={data}
        width={width}
        height={height}
        variant={resolvedVariant}
        showArea
        showTooltip
      />
    </div>
  );
}

export type { TileSparklineProps };
