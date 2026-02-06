"use client";

/**
 * Trade Journal Column Definitions
 *
 * TanStack Table v8 column definitions for the trade journal.
 */

import { createColumnHelper } from "@tanstack/react-table";
import type { TradeJournalRow } from "@/lib/db/types";
import { PnLBadge } from "./pnl-badge";
import { CategoryPill } from "./category-pill";
import { SideBadge } from "./side-badge";
import { StatusBadge } from "./status-badge";

const columnHelper = createColumnHelper<TradeJournalRow>();

export function createTradeColumns(
  onCategoryClick?: (category: string) => void
) {
  return [
    columnHelper.accessor("trade_date", {
      header: "Date",
      cell: (info) => (
        <span className="font-mono text-sm whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
      enableSorting: true,
    }),

    columnHelper.accessor("symbol", {
      header: "Symbol",
      cell: (info) => (
        <span
          className="block max-w-48 truncate font-mono text-sm"
          title={info.getValue()}
        >
          {info.getValue()}
        </span>
      ),
      enableSorting: true,
    }),

    columnHelper.accessor("side", {
      header: "Side",
      cell: (info) => <SideBadge side={info.getValue()} />,
      enableSorting: true,
    }),

    columnHelper.accessor("quantity", {
      header: () => <span className="text-right block">Qty</span>,
      cell: (info) => (
        <span className="block text-right font-mono tabular-nums">
          {info.getValue()}
        </span>
      ),
      enableSorting: true,
    }),

    columnHelper.accessor("price", {
      header: () => <span className="text-right block">Price</span>,
      cell: (info) => (
        <span className="block text-right font-mono tabular-nums">
          ${info.getValue().toFixed(2)}
        </span>
      ),
      enableSorting: true,
    }),

    columnHelper.accessor("pnl", {
      header: () => <span className="text-right block">P&L</span>,
      cell: (info) => (
        <div className="text-right">
          <PnLBadge value={info.getValue()} />
        </div>
      ),
      enableSorting: true,
    }),

    columnHelper.accessor("fees", {
      header: () => <span className="text-right block">Fees</span>,
      cell: (info) => (
        <span className="block text-right font-mono tabular-nums text-muted-foreground">
          ${info.getValue().toFixed(2)}
        </span>
      ),
      enableSorting: true,
    }),

    columnHelper.accessor("category", {
      header: "Category",
      cell: (info) => (
        <CategoryPill
          category={info.getValue()}
          onClick={onCategoryClick}
        />
      ),
      enableSorting: true,
    }),

    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => <StatusBadge status={info.getValue()} />,
      enableSorting: true,
    }),
  ];
}
