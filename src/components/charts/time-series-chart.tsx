"use client";

/**
 * Time Series Chart Component
 *
 * Line chart for displaying trends over time (e.g., net liquidity history).
 */

import {
  AreaChart,
  Area,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chart-theme";
import { ChartEmptyState } from "./chart-empty-state";
import { ChartTooltip } from "./chart-tooltip";

interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

interface TimeSeriesChartProps {
  /** Array of data points with date and value */
  data: TimeSeriesDataPoint[];
  /** Height of the chart */
  height?: number;
  /** Whether to show the grid */
  showGrid?: boolean;
  /** Whether to show the area fill */
  showArea?: boolean;
  /** Whether to show zero line */
  showZeroLine?: boolean;
  /** Color variant for the line */
  variant?: "primary" | "profit" | "loss";
  /** Custom value formatter for tooltip */
  valueFormatter?: (value: number) => string;
  /** Date format for X-axis labels */
  dateFormat?: string;
  /** Accessibility label */
  ariaLabel?: string;
  /** CSS class name */
  className?: string;
}

/**
 * Format date for display
 */
function formatDateLabel(dateStr: string, dateFormat: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, dateFormat);
  } catch {
    return dateStr;
  }
}

/**
 * Format currency for Y-axis with abbreviations
 */
function formatYAxisValue(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Time series chart for displaying trends over time
 */
export function TimeSeriesChart({
  data,
  height = 256,
  showGrid = true,
  showArea = true,
  showZeroLine = false,
  variant = "primary",
  valueFormatter = formatCurrency,
  dateFormat = "MMM yyyy",
  ariaLabel = "Time series chart",
  className,
}: TimeSeriesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={className}>
        <ChartEmptyState height={height} />
      </div>
    );
  }

  const colors = CHART_COLORS[variant];

  // Calculate nice domain for Y-axis
  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const padding = range * 0.1 || Math.abs(maxValue) * 0.1 || 100;

  const yDomain = [
    Math.floor((minValue - padding) / 100) * 100,
    Math.ceil((maxValue + padding) / 100) * 100,
  ];

  return (
    <div
      className={className}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.3 0.015 260 / 0.5)"
              vertical={false}
            />
          )}

          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatDateLabel(value, dateFormat)}
            tick={{ fill: "oklch(0.65 0.02 260)", fontSize: 12 }}
            axisLine={{ stroke: "oklch(0.3 0.015 260)" }}
            tickLine={{ stroke: "oklch(0.3 0.015 260)" }}
            tickMargin={8}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={yDomain}
            tickFormatter={formatYAxisValue}
            tick={{ fill: "oklch(0.65 0.02 260)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            width={60}
          />

          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(label) =>
                  formatDateLabel(label, "MMMM d, yyyy")
                }
                valueFormatter={(value) => valueFormatter(value)}
              />
            }
            cursor={{
              stroke: "oklch(0.65 0.02 260 / 0.5)",
              strokeDasharray: "3 3",
            }}
          />

          {showZeroLine && (
            <ReferenceLine
              y={0}
              stroke="oklch(0.65 0.02 260)"
              strokeDasharray="3 3"
            />
          )}

          <defs>
            <linearGradient id="timeSeriesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.subtleFill} stopOpacity={0.8} />
              <stop offset="95%" stopColor={colors.subtleFill} stopOpacity={0} />
            </linearGradient>
          </defs>

          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            strokeWidth={2}
            fill={showArea ? "url(#timeSeriesGradient)" : "transparent"}
            dot={false}
            activeDot={{
              r: 4,
              fill: colors.stroke,
              stroke: "oklch(0.13 0.028 265)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type { TimeSeriesChartProps, TimeSeriesDataPoint };
