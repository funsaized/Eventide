"use client";

/**
 * FilterBar - Trade journal filter controls
 *
 * Renders filter dropdowns on desktop, Sheet drawer on mobile.
 * Includes active filter chips and clear/export actions.
 */

import { useState } from "react";
import { Filter, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterStore } from "@/lib/state/stores";
import { DateRangeFilter } from "./date-range-filter";
import { CategoryFilter } from "./category-filter";
import { PnLRangeFilter } from "./pnl-range-filter";
import { FilterChip } from "./filter-chip";
import { format, parseISO } from "date-fns";

interface FilterBarProps {
  /** Available categories for the filter */
  categories: string[];
  /** Callback to export current filtered data to CSV */
  onExport?: () => void;
  /** Whether export is available (has data) */
  canExport?: boolean;
}

export function FilterBar({ categories, onExport, canExport = false }: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const dateRange = useFilterStore((s) => s.dateRange);
  const selectedCategories = useFilterStore((s) => s.categories);
  const minPnl = useFilterStore((s) => s.minPnl);
  const maxPnl = useFilterStore((s) => s.maxPnl);
  const status = useFilterStore((s) => s.status);

  const setDateRange = useFilterStore((s) => s.setDateRange);
  const setCategories = useFilterStore((s) => s.setCategories);
  const removeCategory = useFilterStore((s) => s.removeCategory);
  const setMinPnl = useFilterStore((s) => s.setMinPnl);
  const setMaxPnl = useFilterStore((s) => s.setMaxPnl);
  const setStatus = useFilterStore((s) => s.setStatus);
  const clearFilters = useFilterStore((s) => s.clearFilters);

  const hasActiveFilters =
    dateRange !== null ||
    selectedCategories.length > 0 ||
    minPnl !== null ||
    maxPnl !== null ||
    status !== "ALL";

  const filterControls = (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2">
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      <CategoryFilter
        categories={categories}
        value={selectedCategories}
        onChange={setCategories}
      />

      <PnLRangeFilter
        minPnl={minPnl}
        maxPnl={maxPnl}
        onMinChange={setMinPnl}
        onMaxChange={setMaxPnl}
      />

      <Select
        value={status}
        onValueChange={(v) => setStatus(v as "OPEN" | "CLOSED" | "ALL")}
      >
        <SelectTrigger className="h-8 w-[120px] text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          <SelectItem value="OPEN">Open</SelectItem>
          <SelectItem value="CLOSED">Closed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Desktop: inline filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="hidden md:block">{filterControls}</div>

        {/* Mobile: filter trigger + export */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setMobileOpen(true)}
          >
            <Filter className="mr-2 h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {activeFilterCount(dateRange, selectedCategories, minPnl, maxPnl, status)}
              </span>
            )}
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          )}

          {canExport && onExport && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onExport}
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {dateRange && (
            <FilterChip
              label={`${format(parseISO(dateRange.start), "MMM d")} - ${format(parseISO(dateRange.end), "MMM d, yyyy")}`}
              onRemove={() => setDateRange(null)}
            />
          )}

          {selectedCategories.map((cat) => (
            <FilterChip
              key={cat}
              label={cat}
              onRemove={() => removeCategory(cat)}
            />
          ))}

          {minPnl != null && (
            <FilterChip
              label={`Min P&L: $${minPnl}`}
              onRemove={() => setMinPnl(null)}
            />
          )}

          {maxPnl != null && (
            <FilterChip
              label={`Max P&L: $${maxPnl}`}
              onRemove={() => setMaxPnl(null)}
            />
          )}

          {status !== "ALL" && (
            <FilterChip
              label={status === "OPEN" ? "Open" : "Closed"}
              onRemove={() => setStatus("ALL")}
            />
          )}
        </div>
      )}

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Filter your trade journal</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4 pb-4">
            {filterControls}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  clearFilters();
                  setMobileOpen(false);
                }}
              >
                Clear All
              </Button>
              <Button
                className="flex-1"
                onClick={() => setMobileOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function activeFilterCount(
  dateRange: { start: string; end: string } | null,
  categories: string[],
  minPnl: number | null,
  maxPnl: number | null,
  status: string
): number {
  let count = 0;
  if (dateRange) count++;
  if (categories.length > 0) count++;
  if (minPnl != null || maxPnl != null) count++;
  if (status !== "ALL") count++;
  return count;
}

export type { FilterBarProps };
