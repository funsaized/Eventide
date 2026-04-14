"use client";

/**
 * Generic dashboard metric tile.
 */

import * as React from "react";
import { formatCurrency, formatPercent, formatPnl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Tile } from "../tile";
import { TileHeader } from "../tile-header";

type MetricTileFormat = "currency" | "pnl" | "percent" | "raw";
type MetricTileColor = "default" | "profit" | "loss" | "warning";
type MetricTileVariant = React.ComponentProps<typeof Tile>["variant"];

interface MetricTileProps {
  title: string;
  tooltip: string;
  icon: React.ReactNode;
  value: number | string;
  format?: MetricTileFormat;
  color?: MetricTileColor;
  subtitle?: React.ReactNode;
  isLoading?: boolean;
  children?: React.ReactNode;
  variant?: MetricTileVariant;
  loadingValueClassName?: string;
  loadingSubtitleClassName?: string;
}

function formatMetricValue(
  value: number | string,
  format: MetricTileFormat
): string {
  if (typeof value === "string" || format === "raw") {
    return value.toString();
  }

  switch (format) {
    case "pnl":
      return formatPnl(value);
    case "percent":
      return formatPercent(value);
    case "currency":
      return formatCurrency(value);
    default:
      return value.toString();
  }
}

function getValueColorClass(
  value: number | string,
  format: MetricTileFormat,
  color?: MetricTileColor
): string {
  if (color === "default") return "text-foreground";
  if (color === "profit") return "text-profit";
  if (color === "loss") return "text-loss";
  if (color === "warning") return "text-warning";
  if (typeof value !== "number" || format === "raw") return "text-foreground";
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-foreground";
}

function MetricTile({
  title,
  tooltip,
  icon,
  value,
  format = "currency",
  color,
  subtitle,
  isLoading,
  children,
  variant = "default",
  loadingValueClassName = "w-28",
  loadingSubtitleClassName = "w-24",
}: MetricTileProps) {
  if (isLoading) {
    return (
      <Tile variant={variant}>
        <TileHeader title={title} tooltip={tooltip} icon={icon} />
        <div
          className={cn(
            "mt-2 h-8 animate-pulse rounded bg-muted",
            loadingValueClassName
          )}
        />
        <div
          className={cn(
            "mt-2 h-4 animate-pulse rounded bg-muted",
            loadingSubtitleClassName
          )}
        />
      </Tile>
    );
  }

  const content = (
    <>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tabular-nums tracking-tight",
          getValueColorClass(value, format, color)
        )}
      >
        {formatMetricValue(value, format)}
      </p>
      {subtitle ? <div className="mt-1">{subtitle}</div> : null}
    </>
  );

  return (
    <Tile variant={variant}>
      <TileHeader title={title} tooltip={tooltip} icon={icon} />
      {children ? (
        <div className="flex items-end justify-between">
          <div>{content}</div>
          {children}
        </div>
      ) : (
        content
      )}
    </Tile>
  );
}

export { MetricTile };
export type { MetricTileProps, MetricTileColor, MetricTileFormat };
