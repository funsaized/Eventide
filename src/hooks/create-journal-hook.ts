"use client";

import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/state/stores";
import { useTradeFilter, toSortOptions } from "./use-trade-filter";
import type { SortingState } from "@tanstack/react-table";
import type { PaginationOptions, SortOptions, TradeFilter } from "@/lib/db/types";

export function createPaginatedJournalHook<T>(
  queryKeyFn: (params: Record<string, unknown>) => readonly unknown[],
  queryFn: (
    filter: TradeFilter,
    pagination: PaginationOptions,
    sort?: SortOptions
  ) => Promise<T>
): (sorting: SortingState) => ReturnType<typeof useQuery<T>>;
export function createPaginatedJournalHook<T, TSortField extends string>(
  queryKeyFn: (params: Record<string, unknown>) => readonly unknown[],
  queryFn: (
    filter: TradeFilter,
    pagination: PaginationOptions,
    sort?: SortOptions<TSortField>
  ) => Promise<T>,
  allowedFields: readonly TSortField[]
): (sorting: SortingState) => ReturnType<typeof useQuery<T>>;
export function createPaginatedJournalHook<T, TSortField extends string = string>(
  queryKeyFn: (params: Record<string, unknown>) => readonly unknown[],
  queryFn: (
    filter: TradeFilter,
    pagination: PaginationOptions,
    sort?: SortOptions
  ) => Promise<T>,
  allowedFields?: readonly TSortField[]
) {
  return function useJournalData(sorting: SortingState) {
    const page = useFilterStore((s) => s.page);
    const pageSize = useFilterStore((s) => s.pageSize);
    const filter = useTradeFilter();
    const sort = allowedFields ? toSortOptions(sorting, allowedFields) : toSortOptions(sorting);

    return useQuery({
      queryKey: queryKeyFn({ filter, page, pageSize, sort }),
      queryFn: () => queryFn(filter, { page, pageSize }, sort),
      staleTime: 60 * 1000,
    });
  };
}

export function createJournalHook<T, TSortField extends string>(
  allowedFields: readonly TSortField[],
  queryKeyFn: (params: Record<string, unknown>) => readonly unknown[],
  queryFn: (
    filter: TradeFilter,
    pagination: PaginationOptions,
    sort?: SortOptions<TSortField>
  ) => Promise<T>
) {
  return function useJournalData(sorting: SortingState) {
    const page = useFilterStore((s) => s.page);
    const pageSize = useFilterStore((s) => s.pageSize);
    const filter = useTradeFilter();
    const sort = toSortOptions(sorting, allowedFields);

    return useQuery({
      queryKey: queryKeyFn({ filter, page, pageSize, sort }),
      queryFn: () => queryFn(filter, { page, pageSize }, sort),
      staleTime: 60 * 1000,
    });
  };
}

export type { SortingState };
