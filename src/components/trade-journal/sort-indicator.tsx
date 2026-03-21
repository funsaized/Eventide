"use client";

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface SortIndicatorProps {
  direction: false | "asc" | "desc";
}

export function SortIndicator({ direction }: SortIndicatorProps) {
  if (direction === "asc") {
    return <ArrowUp className="h-3.5 w-3.5" />;
  }
  if (direction === "desc") {
    return <ArrowDown className="h-3.5 w-3.5" />;
  }
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
}
