"use client";

import { useQuery } from "@tanstack/react-query";
import { POSITION_SORT_FIELDS } from "@/lib/db/queries";
import { queryKeys } from "@/lib/state/query-client";
import {
  getPositionsForJournal,
  getPositionJournalTotals,
  getTradesForPosition,
} from "@/lib/db/queries/trades";
import { createPaginatedJournalHook } from "./create-journal-hook";
import { useTradeFilter } from "./use-trade-filter";
import type { SortingState } from "@tanstack/react-table";

export const usePositionsData = createPaginatedJournalHook(
  ({ filter, page, pageSize, sort }) =>
    queryKeys.positions.journal.list({ filter, page, pageSize, sort }),
  getPositionsForJournal,
  POSITION_SORT_FIELDS
);

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
