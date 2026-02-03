"use client";

/**
 * Dashboard Data Hooks
 *
 * TanStack Query hooks for fetching dashboard data from SQLite.
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/state/query-client";
import {
  getDashboardSummary,
  getNetLiquidityHistory,
  getMonthlyPerformanceChart,
  getCategoryPerformanceChart,
  getLatestImportDate,
  hasData,
  getWinLossCounts,
} from "@/lib/db/queries/dashboard";

/**
 * Hook to check if there is any data in the database
 */
export function useHasData() {
  return useQuery({
    queryKey: queryKeys.database.hasData,
    queryFn: hasData,
    staleTime: Infinity, // Only changes after imports
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch the complete dashboard summary
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: getDashboardSummary,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch net liquidity history for time series chart
 */
export function useNetLiquidityHistory() {
  return useQuery({
    queryKey: queryKeys.dashboard.netLiquidityHistory(),
    queryFn: getNetLiquidityHistory,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to fetch monthly performance for charts
 */
export function useMonthlyPerformance(months: number = 12) {
  return useQuery({
    queryKey: [...queryKeys.dashboard.performance.monthly(), months] as const,
    queryFn: () => getMonthlyPerformanceChart(months),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to fetch category performance for charts
 */
export function useCategoryPerformance() {
  return useQuery({
    queryKey: queryKeys.dashboard.performance.category(),
    queryFn: getCategoryPerformanceChart,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to fetch the latest import date
 */
export function useLatestImportDate() {
  return useQuery({
    queryKey: queryKeys.statements.latest(),
    queryFn: getLatestImportDate,
    staleTime: Infinity, // Only changes after imports
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch win/loss counts
 */
export function useWinLossCounts() {
  return useQuery({
    queryKey: [...queryKeys.dashboard.all, "winLossCounts"] as const,
    queryFn: getWinLossCounts,
    staleTime: 60 * 1000,
  });
}

/**
 * Composite hook that fetches all dashboard data
 * Use this for the main dashboard view
 */
export function useDashboardData() {
  const hasDataQuery = useHasData();
  const summaryQuery = useDashboardSummary();
  const historyQuery = useNetLiquidityHistory();
  const monthlyQuery = useMonthlyPerformance(6);
  const latestDateQuery = useLatestImportDate();

  const isLoading =
    hasDataQuery.isLoading ||
    summaryQuery.isLoading ||
    historyQuery.isLoading ||
    monthlyQuery.isLoading ||
    latestDateQuery.isLoading;

  const isError =
    hasDataQuery.isError ||
    summaryQuery.isError ||
    historyQuery.isError ||
    monthlyQuery.isError ||
    latestDateQuery.isError;

  const error =
    hasDataQuery.error ||
    summaryQuery.error ||
    historyQuery.error ||
    monthlyQuery.error ||
    latestDateQuery.error;

  return {
    // Query states
    isLoading,
    isError,
    error,
    hasData: hasDataQuery.data ?? false,

    // Data
    summary: summaryQuery.data,
    netLiquidityHistory: historyQuery.data ?? [],
    monthlyPerformance: monthlyQuery.data ?? [],
    latestImportDate: latestDateQuery.data,

    // Individual query refetch functions
    refetch: () => {
      hasDataQuery.refetch();
      summaryQuery.refetch();
      historyQuery.refetch();
      monthlyQuery.refetch();
      latestDateQuery.refetch();
    },
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;
