"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/state/query-client";
import { getPositionsForJournal, getTradesForPosition } from "@/lib/db/queries/trades";
import { useFilterStore } from "@/lib/state/stores";
import type { SortOptions, TradeFilter } from "@/lib/db/types";
import type { SortingState } from "@tanstack/react-table";

function toSortOptions(sorting: SortingState): SortOptions | undefined {
  if (sorting.length === 0) return undefined;
  const first = sorting[0];
  return {
    field: first.id,
    direction: first.desc ? "desc" : "asc",
  };
}

export function usePositionsData(sorting: SortingState) {
  const page = useFilterStore((s) => s.page);
  const pageSize = useFilterStore((s) => s.pageSize);
  const dateRange = useFilterStore((s) => s.dateRange);
  const categories = useFilterStore((s) => s.categories);
  const symbols = useFilterStore((s) => s.symbols);
  const minPnl = useFilterStore((s) => s.minPnl);
  const maxPnl = useFilterStore((s) => s.maxPnl);
  const status = useFilterStore((s) => s.status);

  const filter: TradeFilter = useMemo(
    () => ({
      dateRange: dateRange ?? undefined,
      categories: categories.length > 0 ? categories : undefined,
      symbols: symbols.length > 0 ? symbols : undefined,
      minPnl: minPnl ?? undefined,
      maxPnl: maxPnl ?? undefined,
      status,
    }),
    [dateRange, categories, symbols, minPnl, maxPnl, status]
  );

  const sort = toSortOptions(sorting);

  return useQuery({
    queryKey: queryKeys.positions.journal.list({ filter, page, pageSize, sort }),
    queryFn: () => getPositionsForJournal(filter, { page, pageSize }, sort),
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
