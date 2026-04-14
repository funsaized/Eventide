"use client";

/**
 * Settings Data Hooks
 *
 * TanStack Query hooks for settings page data:
 * - Import history list
 * - Delete import mutation
 * - Delete all data mutation
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/state/query-client";
import { getStatementImports, deleteStatementImport } from "@/lib/db/queries/statements";
import { execute } from "@/lib/db/client";
import { useAppModeStore } from "@/lib/state/stores";

/**
 * Hook to fetch all statement imports for import history
 */
export function useImportHistory() {
  return useQuery({
    queryKey: queryKeys.statements.list(),
    queryFn: getStatementImports,
  });
}

/**
 * Hook to delete a single import and invalidate related queries
 */
export function useDeleteImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      await deleteStatementImport(importId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.statements.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cashFlows.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.database.hasData });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
}

/**
 * Hook to delete all data from the database
 */
export function useDeleteAllData() {
  const queryClient = useQueryClient();
  const setIsDemo = useAppModeStore((s) => s.setIsDemo);

  return useMutation({
    mutationFn: async () => {
      // Delete in dependency order
      await execute("DELETE FROM closed_positions");
      await execute("DELETE FROM open_positions");
      await execute("DELETE FROM trades");
      await execute("DELETE FROM cash_flows");
      await execute("DELETE FROM statement_imports");
    },
    onSuccess: () => {
      setIsDemo(false);
      queryClient.invalidateQueries();
    },
  });
}
