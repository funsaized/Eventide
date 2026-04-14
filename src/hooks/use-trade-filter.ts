"use client";

import { useMemo } from "react";
import { useFilterStore } from "@/lib/state/stores";
import type { SortOptions, TradeFilter } from "@/lib/db/types";
import type { SortingState } from "@tanstack/react-table";

function isSortField<T extends string>(
  field: string,
  allowedFields: readonly T[]
): field is T {
  return allowedFields.some((allowedField) => allowedField === field);
}

export function toSortOptions(sorting: SortingState): SortOptions | undefined;
export function toSortOptions<T extends string>(
  sorting: SortingState,
  allowedFields: readonly T[]
): SortOptions<T> | undefined;
export function toSortOptions<T extends string>(
  sorting: SortingState,
  allowedFields?: readonly T[]
): SortOptions | SortOptions<T> | undefined {
  if (sorting.length === 0) {
    return undefined;
  }

  const first = sorting[0];

  if (!allowedFields) {
    return {
      field: first.id,
      direction: first.desc ? "desc" : "asc",
    };
  }

  if (!isSortField(first.id, allowedFields)) {
    return undefined;
  }

  return {
    field: first.id,
    direction: first.desc ? "desc" : "asc",
  };
}

export function useTradeFilter(): TradeFilter {
  const dateRange = useFilterStore((s) => s.dateRange);
  const categories = useFilterStore((s) => s.categories);
  const symbols = useFilterStore((s) => s.symbols);
  const sides = useFilterStore((s) => s.sides);
  const minPnl = useFilterStore((s) => s.minPnl);
  const maxPnl = useFilterStore((s) => s.maxPnl);
  const status = useFilterStore((s) => s.status);

  return useMemo(
    () => ({
      dateRange: dateRange ?? undefined,
      categories: categories.length > 0 ? categories : undefined,
      symbols: symbols.length > 0 ? symbols : undefined,
      sides: sides.length > 0 ? sides : undefined,
      minPnl: minPnl ?? undefined,
      maxPnl: maxPnl ?? undefined,
      status,
    }),
    [dateRange, categories, symbols, sides, minPnl, maxPnl, status]
  );
}
