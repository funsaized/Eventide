"use client";

/**
 * Volume Treemap
 *
 * Shows volume distribution by category.
 * Green for net positive categories, red for net negative.
 */

import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chart-theme";
import { ChartEmptyState } from "./chart-empty-state";
import { ChartTooltip } from "./chart-tooltip";

interface VolumeTreemapData {
  category: string;
  volume: number;
  pnl: number;
}

interface VolumeTreemapProps {
  data: VolumeTreemapData[];
  height?: number;
  className?: string;
}

function getColor(pnl: number): string {
  if (pnl > 0) return CHART_COLORS.profit.stroke;
  if (pnl < 0) return CHART_COLORS.loss.stroke;
  return CHART_COLORS.neutral.solid;
}

/**
 * Custom treemap content renderer
 */
function TreemapContent(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  pnl?: number;
  volume?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, pnl = 0, volume = 0 } = props;

  // Don't render text if cell is too small
  const showLabel = width > 50 && height > 30;
  const showVolume = width > 70 && height > 45;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={getColor(pnl)}
        fillOpacity={0.85}
        stroke="oklch(0.13 0.028 265)"
        strokeWidth={2}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showVolume ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="oklch(0.97 0.01 265)"
          fontSize={12}
          fontWeight={600}
        >
          {name}
        </text>
      )}
      {showVolume && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="oklch(0.97 0.01 265 / 0.8)"
          fontSize={10}
        >
          {formatCurrency(volume)}
        </text>
      )}
    </g>
  );
}

export function VolumeTreemap({
  data,
  height = 300,
  className,
}: VolumeTreemapProps) {
  if (!data || data.length === 0) {
    return (
      <div className={className}>
        <ChartEmptyState height={height} />
      </div>
    );
  }

  // Transform for Recharts Treemap (needs `name` and `size` keys)
  const treemapData = data.map((d) => ({
    name: d.category,
    size: d.volume,
    volume: d.volume,
    pnl: d.pnl,
  }));

  return (
    <div
      className={className}
      style={{ height }}
      role="img"
      aria-label="Volume distribution treemap"
    >
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="oklch(0.13 0.028 265)"
          content={<TreemapContent />}
        >
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(label) => label}
                valueFormatter={(value, name) => {
                  if (name === "pnl") return `P&L: ${formatCurrency(value)}`;
                  return `Vol: ${formatCurrency(value)}`;
                }}
              />
            }
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

export type { VolumeTreemapProps, VolumeTreemapData };
