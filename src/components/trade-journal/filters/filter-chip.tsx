"use client";

/**
 * FilterChip - Shows an active filter with a remove button
 */

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 pr-1 text-xs font-normal"
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

export type { FilterChipProps };
