"use client";

/**
 * Category Performance Chart
 *
 * Horizontal bar chart showing net P&L by category.
 * Click on a bar to navigate to trades filtered by that category.
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import { useRouter } from "next/navigation";
import { ChartTooltip, formatCurrency } from "./chart-tooltip";
import { useFilterStore } from "@/lib/state/stores";

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

const PROFIT_COLOR = "oklch(0.65 0.2 145)";
const LOSS_COLOR = "oklch(0.65 0.2 25)";

export function CategoryPerformanceChart({
  data,
  height = 300,
  className,
}: CategoryPerformanceChartProps) {
  const router = useRouter();
  const setCategories = useFilterStore((s) => s.setCategories);

  if (!data || data.length === 0) {
    return (
      <div
        className={className}
        style={{ height }}
        role="img"
        aria-label="No category performance data"
      >
        <div className="flex h-full items-center justify-center text-muted-foreground">
          No data available
        </div>
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
                fill={entry.pnl >= 0 ? PROFIT_COLOR : LOSS_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type { CategoryPerformanceChartProps, CategoryPerformanceData };
