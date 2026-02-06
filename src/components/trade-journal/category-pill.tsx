"use client";

/**
 * CategoryPill - Colored badge for trade categories
 *
 * Each category has a unique color for quick visual identification.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CategoryPillProps {
  /** Category name */
  category: string | null;
  /** Optional click handler for filtering */
  onClick?: (category: string) => void;
  className?: string;
}

/**
 * Category color map
 * Uses tailwind classes for consistent theming
 */
const CATEGORY_COLORS: Record<string, string> = {
  NFL: "bg-blue-600 hover:bg-blue-700",
  NBA: "bg-orange-500 hover:bg-orange-600",
  Economics: "bg-emerald-600 hover:bg-emerald-700",
  Tennis: "bg-yellow-500 hover:bg-yellow-600 text-black",
  Politics: "bg-purple-600 hover:bg-purple-700",
  Soccer: "bg-green-600 hover:bg-green-700",
  "Fed Decision": "bg-teal-600 hover:bg-teal-700",
  Weather: "bg-sky-500 hover:bg-sky-600",
  Crypto: "bg-amber-600 hover:bg-amber-700",
};

const DEFAULT_COLOR = "bg-zinc-600 hover:bg-zinc-700";

export function CategoryPill({ category, onClick, className }: CategoryPillProps) {
  if (!category) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        —
      </Badge>
    );
  }

  const colorClass = CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
  const isClickable = !!onClick;

  return (
    <Badge
      className={cn(
        "border-transparent text-white",
        colorClass,
        isClickable && "cursor-pointer",
        className
      )}
      onClick={isClickable ? () => onClick(category) : undefined}
      role={isClickable ? "button" : undefined}
    >
      {category}
    </Badge>
  );
}

export type { CategoryPillProps };
