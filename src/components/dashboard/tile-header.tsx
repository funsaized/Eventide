"use client";

import * as React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TileHeaderProps {
  /** Tile title text */
  title: string;
  /** Optional tooltip text explaining the metric */
  tooltip?: string;
  /** Optional icon to display before the title */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tile header with title and optional info tooltip.
 */
function TileHeader({ title, tooltip, icon, className }: TileHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        {icon && (
          <span className="text-muted-foreground">{icon}</span>
        )}
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
      </div>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              aria-label={`Information about ${title}`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export { TileHeader };
export type { TileHeaderProps };
