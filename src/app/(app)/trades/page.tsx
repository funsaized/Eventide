"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TradeTable } from "@/components/trade-journal/trade-table";
import { FilterBar } from "@/components/trade-journal/filters";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeleton-loaders";
import { useTradesData, useCategories } from "@/hooks/use-trades-data";
import { useHasData } from "@/hooks/use-dashboard-data";
import { useFilterStore } from "@/lib/state/stores";
import { exportTradesToCSV } from "@/lib/utils/csv-export";
import type { SortingState } from "@tanstack/react-table";

export default function TradesPage() {
  const hasDataQuery = useHasData();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "trade_date", desc: true },
  ]);

  const page = useFilterStore((s) => s.page);
  const pageSize = useFilterStore((s) => s.pageSize);
  const setPage = useFilterStore((s) => s.setPage);
  const setPageSize = useFilterStore((s) => s.setPageSize);
  const addCategory = useFilterStore((s) => s.addCategory);

  const { data, isLoading, isError } = useTradesData(sorting);
  const categoriesQuery = useCategories();

  const handleCategoryClick = useCallback(
    (category: string) => {
      addCategory(category);
    },
    [addCategory]
  );

  const handleExport = useCallback(() => {
    if (data?.trades && data.trades.length > 0) {
      exportTradesToCSV(data.trades);
    }
  }, [data?.trades]);

  // Loading state
  if (isLoading || hasDataQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-4">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>All Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={10} columns={9} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state (no data imported at all)
  if (hasDataQuery.data === false) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <EmptyState variant="trades" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <ErrorState
              title="Failed to load trades"
              description="Something went wrong loading your trade data. Please try refreshing the page."
              onRetry={() => window.location.reload()}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const trades = data?.trades ?? [];
  const total = data?.total ?? 0;
  const categories = categoriesQuery.data ?? [];

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <Card>
        <CardContent className="py-4">
          <FilterBar
            categories={categories}
            onExport={handleExport}
            canExport={trades.length > 0}
          />
        </CardContent>
      </Card>

      {/* Trade table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {total > 0 ? `Trades (${total})` : "All Trades"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TradeTable
            data={trades}
            total={total}
            page={page}
            pageSize={pageSize}
            sorting={sorting}
            onSortingChange={setSorting}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onCategoryClick={handleCategoryClick}
          />
        </CardContent>
      </Card>
    </div>
  );
}
