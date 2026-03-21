"use client";

/**
 * TradeTable - Main trade journal table
 *
 * Uses TanStack Table v8 with shadcn/ui table components.
 * Supports server-side sorting and pagination (via SQLite queries).
 */

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TradeJournalRow } from "@/lib/db/types";
import { createTradeColumns } from "./columns";
import { SortIndicator } from "./sort-indicator";
import { PaginationControls } from "./pagination-controls";

interface TradeTableProps {
  /** Trade data to display */
  data: TradeJournalRow[];
  /** Total number of rows (for pagination info) */
  total: number;
  /** Current page (1-indexed) */
  page: number;
  /** Rows per page */
  pageSize: number;
  /** Current sort state */
  sorting: SortingState;
  /** Callback when sort changes */
  onSortingChange: (sorting: SortingState) => void;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (size: number) => void;
  /** Callback when a category pill is clicked */
  onCategoryClick?: (category: string) => void;
}

export function TradeTable({
  data,
  total,
  page,
  pageSize,
  sorting,
  onSortingChange,
  onPageChange,
  onPageSizeChange,
  onCategoryClick,
}: TradeTableProps) {
  const columns = useMemo(
    () => createTradeColumns(onCategoryClick),
    [onCategoryClick]
  );

  const pageCount = Math.ceil(total / pageSize);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Manual sorting (handled by SQL query)
    manualSorting: true,
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
    state: {
      sorting,
    },
    // Manual pagination (handled by SQL query)
    manualPagination: true,
    pageCount,
  });

  return (
    <div className="space-y-4">
      {/* Table with horizontal scroll on mobile */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      // Sticky first column on mobile
                      index === 0 &&
                        "sticky left-0 z-10 bg-background md:static"
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors -ml-1 px-1 py-0.5 rounded"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        <SortIndicator direction={header.column.getIsSorted()} />
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        // Sticky first column on mobile
                        index === 0 &&
                          "sticky left-0 z-10 bg-background md:static"
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No trades found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        total={total}
        label="trades"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

export type { TradeTableProps };
