"use client";

import { useQuery } from "@tanstack/react-query";
import { TRADE_SORT_FIELDS } from "@/lib/db/queries";
import { queryKeys } from "@/lib/state/query-client";
import { getTradesForJournal, getUniqueCategories } from "@/lib/db/queries/trades";
import { createPaginatedJournalHook } from "./create-journal-hook";
import type { SortingState } from "@tanstack/react-table";

export const useTradesData = createPaginatedJournalHook(
  ({ filter, page, pageSize, sort }) => queryKeys.trades.list({ filter, page, pageSize, sort }),
  getTradesForJournal,
  TRADE_SORT_FIELDS
);

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.trades.categories(),
    queryFn: getUniqueCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export type { SortingState };
