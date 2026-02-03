"use client";

/**
 * Sparkline Component
 *
 * Mini inline chart for dashboard tiles showing trends.
 */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  YAxis,
} from "recharts";
import { SparklineTooltip, formatCurrency } from "./chart-tooltip";

interface SparklineDataPoint {
  value: number;
  date?: string;
}

interface SparklineProps {
  /** Array of data points */
  data: SparklineDataPoint[];
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Color variant */
  variant?: "primary" | "profit" | "loss" | "neutral";
  /** Whether to show area fill */
  showArea?: boolean;
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  /** Custom value formatter */
  valueFormatter?: (value: number) => string;
  /** CSS class name */
  className?: string;
}

const VARIANT_COLORS = {
  primary: {
    stroke: "oklch(0.55 0.24 264)", // --chart-1
    fill: "oklch(0.55 0.24 264 / 0.2)",
  },
  profit: {
    stroke: "oklch(0.65 0.2 145)", // --profit
    fill: "oklch(0.65 0.2 145 / 0.2)",
  },
  loss: {
    stroke: "oklch(0.65 0.2 25)", // --loss
    fill: "oklch(0.65 0.2 25 / 0.2)",
  },
  neutral: {
    stroke: "oklch(0.65 0.02 260)", // --muted-foreground
    fill: "oklch(0.65 0.02 260 / 0.15)",
  },
};

/**
 * Determine variant based on trend (first vs last value)
 */
function getAutoVariant(
  data: SparklineDataPoint[]
): "profit" | "loss" | "neutral" {
  if (data.length < 2) return "neutral";
  const first = data[0].value;
  const last = data[data.length - 1].value;
  if (last > first) return "profit";
  if (last < first) return "loss";
  return "neutral";
}

/**
 * Sparkline chart for dashboard tiles
 */
export function Sparkline({
  data,
  width = 80,
  height = 32,
  variant,
  showArea = true,
  showTooltip = true,
  valueFormatter = formatCurrency,
  className,
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={className}
        style={{ width, height }}
        aria-label="No data available"
      />
    );
  }

  // Auto-detect variant if not provided
  const resolvedVariant = variant ?? getAutoVariant(data);
  const colors = VARIANT_COLORS[resolvedVariant];

  // Calculate domain with padding
  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1 || 1;

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis
            domain={[minValue - padding, maxValue + padding]}
            hide
          />
          {showTooltip && (
            <Tooltip
              content={<SparklineTooltip valueFormatter={valueFormatter} />}
              cursor={false}
            />
          )}
          <defs>
            <linearGradient
              id={`sparkline-gradient-${resolvedVariant}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={colors.fill} stopOpacity={0.8} />
              <stop offset="95%" stopColor={colors.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            strokeWidth={1.5}
            fill={showArea ? `url(#sparkline-gradient-${resolvedVariant})` : "transparent"}
            dot={false}
            activeDot={showTooltip ? { r: 3, fill: colors.stroke } : false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type { SparklineProps, SparklineDataPoint };
