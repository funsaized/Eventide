"use client";

/**
 * Trade Journal Data Hook
 *
 * TanStack Query hook for fetching paginated, sorted, filtered trades.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/state/query-client";
import { getTradesForJournal } from "@/lib/db/queries/trades";
import { useFilterStore } from "@/lib/state/stores";
import type { SortOptions } from "@/lib/db/types";
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
  const getFilter = useFilterStore((s) => s.getFilter);

  const filter = getFilter();
  const sort = toSortOptions(sorting);

  return useQuery({
    queryKey: queryKeys.trades.list({ filter, page, pageSize, sort }),
    queryFn: () =>
      getTradesForJournal(filter, { page, pageSize }, sort),
    staleTime: 60 * 1000,
  });
}

export type { SortingState };
