"use client";

/**
 * Trade Journal Data Hook
 *
 * TanStack Query hook for fetching paginated, sorted, filtered trades.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/state/query-client";
import { getTradesForJournal, getUniqueCategories } from "@/lib/db/queries/trades";
import { useFilterStore } from "@/lib/state/stores";
import type { SortOptions, TradeFilter } from "@/lib/db/types";
import type { SortingState } from "@tanstack/react-table";

/**
 * Convert TanStack Table SortingState to our SortOptions
 */
function toSortOptions(sorting: SortingState): SortOptions | undefined {
  if (sorting.length === 0) return undefined;
  const first = sorting[0];
  return {
    field: first.id,
    direction: first.desc ? "desc" : "asc",
  };
}

/**
 * Hook for fetching trade journal data with filters, pagination, and sorting
 */
export function useTradesData(sorting: SortingState) {
  const page = useFilterStore((s) => s.page);
  const pageSize = useFilterStore((s) => s.pageSize);

  // Subscribe to individual filter values so Zustand detects changes
  const dateRange = useFilterStore((s) => s.dateRange);
  const categories = useFilterStore((s) => s.categories);
  const symbols = useFilterStore((s) => s.symbols);
  const sides = useFilterStore((s) => s.sides);
  const minPnl = useFilterStore((s) => s.minPnl);
  const maxPnl = useFilterStore((s) => s.maxPnl);
  const status = useFilterStore((s) => s.status);

  const filter: TradeFilter = useMemo(
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

  const sort = toSortOptions(sorting);

  return useQuery({
    queryKey: queryKeys.trades.list({ filter, page, pageSize, sort }),
    queryFn: () =>
      getTradesForJournal(filter, { page, pageSize }, sort),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook for fetching unique trade categories (for filter dropdown)
 */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.trades.categories(),
    queryFn: getUniqueCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export type { SortingState };
