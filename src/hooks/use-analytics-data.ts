"use client";

/**
 * Analytics Data Hooks
 *
 * TanStack Query hooks for fetching analytics chart data from SQLite.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/state/query-client";
import {
  getCategoryPerformanceChart,
  getVolumeByCategory,
  getMonthlyFeesWithCumulative,
} from "@/lib/db/queries/dashboard";

/**
 * Hook to fetch category performance for horizontal bar chart
 */
export function useCategoryPerformanceChart() {
  return useQuery({
    queryKey: queryKeys.analytics.categoryPerformance(),
    queryFn: getCategoryPerformanceChart,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to fetch volume distribution by category for treemap
 */
export function useVolumeDistribution() {
  return useQuery({
    queryKey: queryKeys.analytics.volumeDistribution(),
    queryFn: getVolumeByCategory,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to fetch monthly fee data with cumulative totals
 */
export function useFeeAnalysis() {
  return useQuery({
    queryKey: queryKeys.analytics.feeAnalysis(),
    queryFn: getMonthlyFeesWithCumulative,
    staleTime: 60 * 1000,
  });
}
