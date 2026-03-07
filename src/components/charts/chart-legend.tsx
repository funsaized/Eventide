"use client";

/**
 * Chart Legend Component
 *
 * Reusable legend for charts with colored indicators.
 */

import { cn } from "@/lib/utils";

interface ChartLegendItem {
  label: string;
  color: string;
  type?: "square" | "line" | "circle";
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  className?: string;
}

export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          {item.type === "line" ? (
            <div
              className="h-0.5 w-4 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          ) : (
            <div
              className={cn(
                "h-2.5 w-2.5",
                item.type === "circle" ? "rounded-full" : "rounded-sm"
              )}
              style={{ backgroundColor: item.color }}
            />
          )}
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export type { ChartLegendProps, ChartLegendItem };
