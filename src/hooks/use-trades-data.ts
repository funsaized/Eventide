"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/state/query-client";
import { getTradesForJournal, getUniqueCategories } from "@/lib/db/queries/trades";
import { useFilterStore } from "@/lib/state/stores";
import { useTradeFilter, toSortOptions } from "./use-trade-filter";
import type { SortingState } from "@tanstack/react-table";

export function useTradesData(sorting: SortingState) {
  const page = useFilterStore((s) => s.page);
  const pageSize = useFilterStore((s) => s.pageSize);
  const filter = useTradeFilter();
  const sort = toSortOptions(sorting);

  return useQuery({
    queryKey: queryKeys.trades.list({ filter, page, pageSize, sort }),
    queryFn: () => getTradesForJournal(filter, { page, pageSize }, sort),
    staleTime: 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.trades.categories(),
    queryFn: getUniqueCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export type { SortingState };
