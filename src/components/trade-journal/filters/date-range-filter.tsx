"use client";

/**
 * DateRangeFilter - Calendar-based date range picker
 *
 * react-day-picker v9 range mode fires onSelect on each click:
 *   click 1 → { from: Date, to: undefined }
 *   click 2 → { from: Date, to: Date }
 *
 * We keep local `pending` state so the calendar shows visual feedback
 * between clicks, and controlled `open` state to close the popover
 * once a full range is committed.
 */

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface DateRangeFilterProps {
  value: { start: string; end: string } | null;
  onChange: (range: { start: string; end: string } | null) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  // Local pending state for visual feedback between click 1 and click 2
  const [pending, setPending] = useState<DateRange | undefined>(undefined);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Reset pending to committed value when opening
      setPending(
        value
          ? { from: parseISO(value.start), to: parseISO(value.end) }
          : undefined
      );
    }
  }

  function handleSelect(range: DateRange | undefined) {
    // Always update pending so the calendar shows the selection in progress
    setPending(range);

    // Commit only when both from and to are set (second click)
    if (range?.from && range.to) {
      onChange({
        start: format(range.from, "yyyy-MM-dd"),
        end: format(range.to, "yyyy-MM-dd"),
      });
      setOpen(false);
    }
  }

  const label = value
    ? `${format(parseISO(value.start), "MMM d, yyyy")} – ${format(parseISO(value.end), "MMM d, yyyy")}`
    : "Date range";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          min={2}
          defaultMonth={pending?.from}
          selected={pending}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

export type { DateRangeFilterProps };
