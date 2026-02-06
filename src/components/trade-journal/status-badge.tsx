"use client";

/**
 * StatusBadge - Open/Closed trade status indicator
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "OPEN" | "CLOSED";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={status === "OPEN" ? "secondary" : "outline"}
      className={cn(
        status === "CLOSED" && "text-muted-foreground",
        className
      )}
    >
      {status === "OPEN" ? "Open" : "Closed"}
    </Badge>
  );
}

export type { StatusBadgeProps };
