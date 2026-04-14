"use client";

/**
 * CategoryPill - Colored badge for trade categories
 *
 * Each category has a unique color for quick visual identification.
 */

import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORY_COLOR,
} from "@/lib/category-colors";
import { cn } from "@/lib/utils";

interface CategoryPillProps {
  /** Category name */
  category: string | null;
  /** Optional click handler for filtering */
  onClick?: (category: string) => void;
  className?: string;
}

export function CategoryPill({ category, onClick, className }: CategoryPillProps) {
  if (!category) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        —
      </Badge>
    );
  }

  const colorClass = CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
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
