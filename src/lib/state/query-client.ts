/**
 * TanStack Query Client Configuration
 *
 * Manages data fetching, caching, and background updates for SQLite queries.
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Create a new QueryClient instance with optimized defaults
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data fresh for 1 minute before refetching
        staleTime: 60 * 1000,
        // Keep unused data in cache for 5 minutes
        gcTime: 5 * 60 * 1000,
        // Retry failed queries 1 time
        retry: 1,
        // Refetch when window regains focus (useful for detecting new imports)
        refetchOnWindowFocus: true,
        // Don't refetch on reconnect for local-first app
        refetchOnReconnect: false,
        // Don't refetch on mount by default
        refetchOnMount: false,
      },
      mutations: {
        // Retry failed mutations 1 time
        retry: 1,
      },
    },
  });
}

/**
 * Query key factory for type-safe query keys
 */
export const queryKeys = {
  // Statement imports
  statements: {
    all: ["statements"] as const,
    list: () => [...queryKeys.statements.all, "list"] as const,
    detail: (id: string) => [...queryKeys.statements.all, "detail", id] as const,
    latest: () => [...queryKeys.statements.all, "latest"] as const,
  },

  // Trades
  trades: {
    all: ["trades"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.trades.all, "list", filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.trades.all, "detail", id] as const,
    byImport: (importId: string) =>
      [...queryKeys.trades.all, "byImport", importId] as const,
    categories: () => [...queryKeys.trades.all, "categories"] as const,
    symbols: () => [...queryKeys.trades.all, "symbols"] as const,
  },

  // Positions
  positions: {
    all: ["positions"] as const,
    closed: {
      all: () => [...queryKeys.positions.all, "closed"] as const,
      list: () => [...queryKeys.positions.all, "closed", "list"] as const,
      bySymbol: (symbol: string) =>
        [...queryKeys.positions.all, "closed", "bySymbol", symbol] as const,
    },
    open: {
      all: () => [...queryKeys.positions.all, "open"] as const,
      current: () => [...queryKeys.positions.all, "open", "current"] as const,
    },
  },

  // Cash flows
  cashFlows: {
    all: ["cashFlows"] as const,
    list: () => [...queryKeys.cashFlows.all, "list"] as const,
    byImport: (importId: string) =>
      [...queryKeys.cashFlows.all, "byImport", importId] as const,
  },

  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    summary: () => [...queryKeys.dashboard.all, "summary"] as const,
    netLiquidity: () => [...queryKeys.dashboard.all, "netLiquidity"] as const,
    netLiquidityHistory: () =>
      [...queryKeys.dashboard.all, "netLiquidityHistory"] as const,
    performance: {
      monthly: () => [...queryKeys.dashboard.all, "performance", "monthly"] as const,
      category: () =>
        [...queryKeys.dashboard.all, "performance", "category"] as const,
    },
    fees: () => [...queryKeys.dashboard.all, "fees"] as const,
  },

  // Database health
  database: {
    health: ["database", "health"] as const,
    hasData: ["database", "hasData"] as const,
  },
} as const;

/**
 * Invalidate all queries after data changes (e.g., after import)
 */
export function invalidateAllQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries();
}

/**
 * Invalidate queries related to a specific import
 * Note: Currently invalidates all related queries; importId reserved for future filtering
 */
export function invalidateImportQueries(
  queryClient: QueryClient,
  _importId: string
): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.statements.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.trades.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.cashFlows.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.database.hasData }),
  ]);
}

/**
 * Prefetch common dashboard data
 */
export async function prefetchDashboardData(
  queryClient: QueryClient,
  getDashboardSummary: () => Promise<unknown>,
  getNetLiquidityHistory: () => Promise<unknown>
): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.summary(),
      queryFn: getDashboardSummary,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.netLiquidityHistory(),
      queryFn: getNetLiquidityHistory,
    }),
  ]);
}
