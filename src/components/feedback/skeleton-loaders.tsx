"use client";

/**
 * Skeleton Loaders
 *
 * Loading placeholders for various UI components.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base skeleton component with pulse animation
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      role="status"
      aria-label="Loading..."
      {...props}
    />
  );
}

/**
 * Skeleton for dashboard tiles
 */
export function TileSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        className
      )}
      role="status"
      aria-label="Loading tile..."
    >
      {/* Header with icon placeholder */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Value */}
      <Skeleton className="mt-3 h-8 w-28" />

      {/* Trend/subtitle */}
      <Skeleton className="mt-2 h-4 w-20" />
    </div>
  );
}

/**
 * Skeleton for the complete dashboard grid (6 tiles)
 */
export function DashboardGridSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
      role="status"
      aria-label="Loading dashboard..."
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <TileSkeleton key={i} />
      ))}
    </div>
  );
}

// Deterministic heights for chart skeleton bars
const CHART_BAR_HEIGHTS = [35, 50, 65, 40, 75, 55, 80, 45, 60, 70, 30, 50];

/**
 * Skeleton for charts
 */
export function ChartSkeleton({
  className,
  height = 256,
}: SkeletonProps & { height?: number }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden",
        className
      )}
      style={{ height }}
      role="status"
      aria-label="Loading chart..."
    >
      {/* Chart header */}
      <div className="border-b border-border p-4">
        <Skeleton className="h-5 w-40" />
      </div>

      {/* Chart body */}
      <div className="flex h-full items-center justify-center p-4">
        <div className="flex w-full items-end justify-between gap-1">
          {CHART_BAR_HEIGHTS.map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1"
              style={{
                height: `${h}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Deterministic widths for table cells
const CELL_WIDTHS = [60, 80, 50, 70, 55, 75, 65, 45];

/**
 * Skeleton for table rows
 */
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton
            className="h-4"
            style={{
              width: `${CELL_WIDTHS[i % CELL_WIDTHS.length]}%`,
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// Deterministic widths for table headers
const HEADER_WIDTHS = [70, 90, 60, 80, 65, 75];

/**
 * Skeleton for a full table
 */
export function TableSkeleton({
  rows = 5,
  columns = 6,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card", className)}
      role="status"
      aria-label="Loading table..."
    >
      {/* Header */}
      <div className="border-b border-border p-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4 flex-1"
              style={{ maxWidth: `${HEADER_WIDTHS[i % HEADER_WIDTHS.length]}px` }}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Inline text skeleton
 */
export function TextSkeleton({
  width = "auto",
  className,
}: SkeletonProps & { width?: string | number }) {
  return (
    <Skeleton
      className={cn("h-4", className)}
      style={{ width: typeof width === "number" ? `${width}px` : width }}
    />
  );
}

/**
 * Sparkline skeleton
 */
export function SparklineSkeleton({
  width = 80,
  height = 32,
  className,
}: SkeletonProps & { width?: number; height?: number }) {
  return (
    <Skeleton
      className={cn("rounded", className)}
      style={{ width, height }}
    />
  );
}

export type { SkeletonProps };
