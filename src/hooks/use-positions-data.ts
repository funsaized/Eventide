"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/state/query-client";
import {
  getPositionsForJournal,
  getPositionJournalTotals,
  getTradesForPosition,
} from "@/lib/db/queries/trades";
import { useFilterStore } from "@/lib/state/stores";
import { useTradeFilter, toSortOptions } from "./use-trade-filter";
import type { SortingState } from "@tanstack/react-table";

export function usePositionsData(sorting: SortingState) {
  const page = useFilterStore((s) => s.page);
  const pageSize = useFilterStore((s) => s.pageSize);
  const filter = useTradeFilter();
  const sort = toSortOptions(sorting);

  return useQuery({
    queryKey: queryKeys.positions.journal.list({ filter, page, pageSize, sort }),
    queryFn: () => getPositionsForJournal(filter, { page, pageSize }, sort),
    staleTime: 60 * 1000,
  });
}

export function usePositionTotals() {
  const filter = useTradeFilter();

  return useQuery({
    queryKey: queryKeys.positions.journal.totals({ filter }),
    queryFn: () => getPositionJournalTotals(filter),
    staleTime: 60 * 1000,
  });
}

export function usePositionTrades(symbol: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.positions.journal.trades(symbol),
    queryFn: () => getTradesForPosition(symbol),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export type { SortingState };
