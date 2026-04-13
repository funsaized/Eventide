"use client";

/**
 * Import Statement Mutation Hook
 *
 * TanStack Query mutation for importing statement files.
 * Automatically invalidates relevant queries on success.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/state/query-client";
import { importStatement } from "@/lib/parsing/robinhood/import-pipeline";
import type { ImportPhase, ImportResult } from "@/lib/parsing/robinhood/import-pipeline";

export type ProgressCallback = (
  phase: ImportPhase,
  progress: number,
  message: string
) => void;

export interface ImportOptions {
  skipDuplicateCheck?: boolean;
  verbose?: boolean;
  onProgress?: ProgressCallback;
}

/**
 * Hook for importing statement files
 *
 * Usage:
 * ```tsx
 * const { mutate, isPending, isError, error } = useImportStatement({
 *   onProgress: (phase, progress, message) => { ... },
 *   onSuccess: (result) => { ... },
 * });
 *
 * // Trigger import
 * mutate({ file, skipDuplicateCheck: false });
 * ```
 */
export function useImportStatement(options?: {
  onProgress?: ProgressCallback;
  onSuccess?: (result: ImportResult) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["import", "statement"],
    mutationFn: async ({
      file,
      skipDuplicateCheck = false,
    }: {
      file: File;
      skipDuplicateCheck?: boolean;
    }): Promise<ImportResult> => {
      return importStatement(
        file,
        { skipDuplicateCheck, verbose: false },
        options?.onProgress
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate all relevant queries so dashboard shows fresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.statements.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.trades.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.positions.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.cashFlows.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.database.hasData });
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      }

      options?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export type UseImportStatementReturn = ReturnType<typeof useImportStatement>;
