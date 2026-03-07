"use client";

/**
 * Fee Analysis Chart
 *
 * Stacked bar chart showing monthly fees with a cumulative line overlay.
 */

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartTooltip, formatCurrency } from "./chart-tooltip";
import { ChartLegend } from "./chart-legend";
import { format, parseISO } from "date-fns";

interface FeeAnalysisData {
  month: string;
  fees: number;
  cumulative: number;
}

interface FeeAnalysisChartProps {
  data: FeeAnalysisData[];
  height?: number;
  className?: string;
}

const BAR_COLOR = "oklch(0.6 0.15 200)"; // chart-5
const LINE_COLOR = "oklch(0.75 0.18 75)"; // warning/yellow

function formatMonth(monthStr: string): string {
  try {
    return format(parseISO(`${monthStr}-01`), "MMM yyyy");
  } catch {
    return monthStr;
  }
}

function formatShortMonth(monthStr: string): string {
  try {
    return format(parseISO(`${monthStr}-01`), "MMM");
  } catch {
    return monthStr;
  }
}

export function FeeAnalysisChart({
  data,
  height = 300,
  className,
}: FeeAnalysisChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={className}
        style={{ height: height + 32 }}
        role="img"
        aria-label="No fee data"
      >
        <div className="flex h-full items-center justify-center text-muted-foreground">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div style={{ height }} role="img" aria-label="Fee analysis chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.3 0.015 260 / 0.5)"
              vertical={false}
            />

            <XAxis
              dataKey="month"
              tickFormatter={formatShortMonth}
              tick={{ fill: "oklch(0.65 0.02 260)", fontSize: 12 }}
              axisLine={{ stroke: "oklch(0.3 0.015 260)" }}
              tickLine={{ stroke: "oklch(0.3 0.015 260)" }}
              tickMargin={8}
            />

            <YAxis
              yAxisId="bar"
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              tick={{ fill: "oklch(0.65 0.02 260)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />

            <YAxis
              yAxisId="line"
              orientation="right"
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              tick={{ fill: "oklch(0.65 0.02 260)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />

            <Tooltip
              content={
                <ChartTooltip
                  labelFormatter={formatMonth}
                  valueFormatter={formatCurrency}
                />
              }
              cursor={{ fill: "oklch(0.3 0.015 260 / 0.3)" }}
            />

            <Bar
              yAxisId="bar"
              dataKey="fees"
              name="Monthly Fees"
              fill={BAR_COLOR}
              radius={[4, 4, 0, 0]}
              barSize={32}
            />

            <Line
              yAxisId="line"
              type="monotone"
              dataKey="cumulative"
              name="Cumulative"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: LINE_COLOR,
                stroke: "oklch(0.13 0.028 265)",
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ChartLegend
        items={[
          { label: "Monthly Fees", color: BAR_COLOR, type: "square" },
          { label: "Cumulative", color: LINE_COLOR, type: "line" },
        ]}
        className="mt-3 justify-center"
      />
    </div>
  );
}

export type { FeeAnalysisChartProps, FeeAnalysisData };
