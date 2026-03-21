"use client";

/**
 * PnLRangeFilter - Min/max P&L input filter
 *
 * Uses two number inputs for specifying a P&L range.
 */

import { useState, useCallback } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PnLRangeFilterProps {
  minPnl: number | null;
  maxPnl: number | null;
  onMinChange: (value: number | null) => void;
  onMaxChange: (value: number | null) => void;
}

export function PnLRangeFilter({
  minPnl,
  maxPnl,
  onMinChange,
  onMaxChange,
}: PnLRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState(minPnl?.toString() ?? "");
  const [localMax, setLocalMax] = useState(maxPnl?.toString() ?? "");

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        setLocalMin(minPnl?.toString() ?? "");
        setLocalMax(maxPnl?.toString() ?? "");
      }
    },
    [minPnl, maxPnl]
  );

  const apply = useCallback(() => {
    const min = localMin === "" ? null : parseFloat(localMin);
    const max = localMax === "" ? null : parseFloat(localMax);
    onMinChange(min != null && !isNaN(min) ? min : null);
    onMaxChange(max != null && !isNaN(max) ? max : null);
    setOpen(false);
  }, [localMin, localMax, onMinChange, onMaxChange]);

  const hasValue = minPnl != null || maxPnl != null;

  const label = hasValue
    ? `P&L: ${minPnl != null ? `$${minPnl}` : "any"} to ${maxPnl != null ? `$${maxPnl}` : "any"}`
    : "P&L range";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 font-normal",
            !hasValue && "text-muted-foreground"
          )}
        >
          <DollarSign className="mr-2 h-3.5 w-3.5" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <div className="grid gap-3">
          <p className="text-sm font-medium">P&L Range</p>
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label htmlFor="pnl-min" className="text-xs">
                Minimum ($)
              </Label>
              <Input
                id="pnl-min"
                type="number"
                step="0.01"
                placeholder="-100.00"
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") apply();
                }}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="pnl-max" className="text-xs">
                Maximum ($)
              </Label>
              <Input
                id="pnl-max"
                type="number"
                step="0.01"
                placeholder="500.00"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") apply();
                }}
              />
            </div>
          </div>
          <Button size="sm" className="h-8" onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { PnLRangeFilterProps };
