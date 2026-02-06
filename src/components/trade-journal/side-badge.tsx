"use client";

/**
 * SideBadge - YES/NO trade side indicator
 *
 * YES uses profit color, NO uses loss color.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TradeSide } from "@/lib/db/types";

interface SideBadgeProps {
  side: TradeSide;
  className?: string;
}

export function SideBadge({ side, className }: SideBadgeProps) {
  const isYes = side === "YES" || side === "LONG";

  return (
    <Badge
      variant="outline"
      className={cn(
        isYes ? "border-profit text-profit" : "border-loss text-loss",
        className
      )}
    >
      {side}
    </Badge>
  );
}

export type { SideBadgeProps };
