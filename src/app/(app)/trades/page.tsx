"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PositionTable } from "@/components/trade-journal/position-table";
import { FilterBar } from "@/components/trade-journal/filters";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeleton-loaders";
import { usePositionsData, usePositionTotals, useCategories, useTradeFilter } from "@/hooks";
import { useHasData } from "@/hooks/use-dashboard-data";
import { useFilterStore } from "@/lib/state/stores";
import { getTradesForJournal } from "@/lib/db/queries/trades";
import { exportTradesToCSV } from "@/lib/utils/csv-export";
import type { SortingState } from "@tanstack/react-table";

export default function TradesPage() {
  const hasDataQuery = useHasData();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "first_trade_date", desc: true },
  ]);

  const page = useFilterStore((s) => s.page);
  const pageSize = useFilterStore((s) => s.pageSize);
  const setPage = useFilterStore((s) => s.setPage);
  const setPageSize = useFilterStore((s) => s.setPageSize);
  const addCategory = useFilterStore((s) => s.addCategory);

  const filter = useTradeFilter();
  const { data, isLoading, isError } = usePositionsData(sorting);
  const totalsQuery = usePositionTotals();
  const categoriesQuery = useCategories();

  const handleCategoryClick = useCallback(
    (category: string) => {
      addCategory(category);
    },
    [addCategory]
  );

  const handleExport = useCallback(async () => {
    const result = await getTradesForJournal(filter, { page: 1, pageSize: 10000 });
    if (result.trades.length > 0) {
      exportTradesToCSV(result.trades);
    }
  }, [filter]);

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
            <CardTitle>All Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={10} columns={10} />
          </CardContent>
        </Card>
      </div>
    );
  }

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

  if (isError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <ErrorState
              title="Failed to load positions"
              description="Something went wrong loading your position data. Please try refreshing the page."
              onRetry={() => window.location.reload()}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const positions = data?.positions ?? [];
  const total = data?.total ?? 0;
  const availableCategories = categoriesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-4">
          <FilterBar
            categories={availableCategories}
            onExport={handleExport}
            canExport={positions.length > 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {total > 0 ? `Positions (${total})` : "All Positions"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PositionTable
            data={positions}
            total={total}
            page={page}
            pageSize={pageSize}
            sorting={sorting}
            onSortingChange={setSorting}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onCategoryClick={handleCategoryClick}
            totals={totalsQuery.data}
          />
        </CardContent>
      </Card>
    </div>
  );
}
