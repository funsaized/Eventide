"use client";

import * as React from "react";
import { useMemo, useState, useCallback, useEffect } from "react";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PositionJournalRow, PositionJournalTotals } from "@/lib/db/types";
import { getStickyColumnClassName } from "@/lib/utils/table-utils";
import { PnLBadge } from "./pnl-badge";
import { createPositionColumns } from "./position-columns";
import { PositionRowDetail } from "./position-row-detail";
import { SortIndicator } from "./sort-indicator";
import { PaginationControls } from "./pagination-controls";

interface PositionTableProps {
  data: PositionJournalRow[];
  total: number;
  page: number;
  pageSize: number;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onCategoryClick?: (category: string) => void;
  totals?: PositionJournalTotals | null;
}

export function PositionTable({
  data,
  total,
  page,
  pageSize,
  sorting,
  onSortingChange,
  onPageChange,
  onPageSizeChange,
  onCategoryClick,
  totals,
}: PositionTableProps) {
  const [expandedSymbols, setExpandedSymbols] = useState<
    Record<string, boolean>
  >({});

  const handleToggle = useCallback((symbol: string) => {
    setExpandedSymbols((prev) => ({ ...prev, [symbol]: !prev[symbol] }));
  }, []);

  useEffect(() => {
    setExpandedSymbols({});
  }, [data]);

  const columns = useMemo(
    () => createPositionColumns(expandedSymbols, handleToggle, onCategoryClick),
    [expandedSymbols, handleToggle, onCategoryClick]
  );

  const pageCount = Math.ceil(total / pageSize);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
    state: { sorting },
    manualPagination: true,
    pageCount,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={getStickyColumnClassName(index)}
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
                        <SortIndicator
                          direction={header.column.getIsSorted()}
                        />
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
                <React.Fragment key={row.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => handleToggle(row.original.symbol)}
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <TableCell
                        key={cell.id}
                        className={getStickyColumnClassName(index)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedSymbols[row.original.symbol] && (
                    <PositionRowDetail
                      symbol={row.original.symbol}
                      colSpan={columns.length}
                    />
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No positions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {totals && totals.position_count > 0 && (
            <TableFooter>
              <TableRow className="bg-muted/50 font-medium">
                <TableCell />
                <TableCell className="text-sm">
                  Totals ({totals.position_count} positions)
                </TableCell>
                <TableCell />
                <TableCell className="text-right">
                  <PnLBadge value={totals.total_net_pnl} />
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right font-mono tabular-nums text-sm">
                  {totals.total_quantity}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-sm text-muted-foreground">
                  ${totals.total_fees.toFixed(2)}
                </TableCell>
                <TableCell className="text-sm">
                  {totals.wins}W / {totals.losses}L
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <PaginationControls
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        total={total}
        label="positions"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

export type { PositionTableProps };
