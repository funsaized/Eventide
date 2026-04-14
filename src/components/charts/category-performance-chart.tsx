"use client";

/**
 * Category Performance Chart
 *
 * Horizontal bar chart showing net P&L by category.
 * Click on a bar to navigate to trades filtered by that category.
 */

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chart-theme";
import { useFilterStore } from "@/lib/state/stores";
import { ChartEmptyState } from "./chart-empty-state";
import { ChartTooltip } from "./chart-tooltip";

interface CategoryPerformanceData {
  category: string;
  pnl: number;
  winRate: number;
  trades: number;
}

interface CategoryPerformanceChartProps {
  data: CategoryPerformanceData[];
  height?: number;
  className?: string;
}

export function CategoryPerformanceChart({
  data,
  height = 300,
  className,
}: CategoryPerformanceChartProps) {
  const router = useRouter();
  const setCategories = useFilterStore((s) => s.setCategories);

  if (!data || data.length === 0) {
    return (
      <div className={className}>
        <ChartEmptyState height={height} />
      </div>
    );
  }

  const handleBarClick = (entry: CategoryPerformanceData) => {
    setCategories([entry.category]);
    router.push("/trades");
  };

  return (
    <div
      className={className}
      style={{ height }}
      role="img"
      aria-label="Category performance chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(0.3 0.015 260 / 0.5)"
            horizontal={false}
          />

          <XAxis
            type="number"
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fill: "oklch(0.65 0.02 260)", fontSize: 12 }}
            axisLine={{ stroke: "oklch(0.3 0.015 260)" }}
            tickLine={{ stroke: "oklch(0.3 0.015 260)" }}
          />

          <YAxis
            type="category"
            dataKey="category"
            width={100}
            tick={{ fill: "oklch(0.65 0.02 260)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            content={
              <ChartTooltip
                valueFormatter={(value, name) => {
                  if (name === "winRate") return `${(value * 100).toFixed(0)}%`;
                  return formatCurrency(value);
                }}
              />
            }
            cursor={{ fill: "oklch(0.3 0.015 260 / 0.3)" }}
          />

          <ReferenceLine
            x={0}
            stroke="oklch(0.65 0.02 260)"
            strokeDasharray="3 3"
          />

          <Bar
            dataKey="pnl"
            name="Net P&L"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={(_data, index) => {
              const entry = data[index];
              if (entry) handleBarClick(entry);
            }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.category}
                fill={
                  entry.pnl >= 0
                    ? CHART_COLORS.profit.stroke
                    : CHART_COLORS.loss.stroke
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type { CategoryPerformanceChartProps, CategoryPerformanceData };
