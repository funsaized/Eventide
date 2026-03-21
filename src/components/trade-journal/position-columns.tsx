"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { PositionJournalRow } from "@/lib/db/types";
import { PnLBadge } from "./pnl-badge";
import { CategoryPill } from "./category-pill";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<PositionJournalRow>();

export function createPositionColumns(
  expandedSymbols: Record<string, boolean>,
  onToggle: (symbol: string) => void,
  onCategoryClick?: (category: string) => void
) {
  return [
    columnHelper.display({
      id: "expand",
      header: () => null,
      cell: ({ row }) => {
        const isExpanded = expandedSymbols[row.original.symbol] ?? false;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(row.original.symbol);
            }}
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        );
      },
      enableSorting: false,
    }),

    columnHelper.accessor("first_trade_date", {
      header: "Date",
      cell: (info) => {
        const first = info.getValue();
        const last = info.row.original.last_trade_date;
        return (
          <span className="font-mono text-sm whitespace-nowrap">
            {first === last ? first : `${first} – ${last}`}
          </span>
        );
      },
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

    columnHelper.accessor("net_pnl", {
      header: () => <span className="text-right block">Net P&L</span>,
      cell: (info) => (
        <div className="text-right">
          <PnLBadge value={info.getValue()} />
        </div>
      ),
      enableSorting: true,
    }),

    columnHelper.accessor("avg_entry_price", {
      header: () => <span className="text-right block">Entry</span>,
      cell: (info) => {
        const val = info.getValue();
        return (
          <span
            className={cn(
              "block text-right font-mono tabular-nums text-sm",
              val === null && "text-muted-foreground"
            )}
          >
            {val !== null ? `$${val.toFixed(2)}` : "—"}
          </span>
        );
      },
      enableSorting: false,
    }),

    columnHelper.accessor("avg_exit_price", {
      header: () => <span className="text-right block">Exit</span>,
      cell: (info) => {
        const val = info.getValue();
        return (
          <span
            className={cn(
              "block text-right font-mono tabular-nums text-sm",
              val === null && "text-muted-foreground"
            )}
          >
            {val !== null ? `$${val.toFixed(2)}` : "—"}
          </span>
        );
      },
      enableSorting: false,
    }),

    columnHelper.accessor("yes_quantity", {
      header: () => <span className="text-right block">Qty</span>,
      cell: (info) => (
        <span className="block text-right font-mono tabular-nums text-sm">
          {info.getValue()}
        </span>
      ),
      enableSorting: false,
    }),

    columnHelper.accessor("total_fees", {
      header: () => <span className="text-right block">Fees</span>,
      cell: (info) => (
        <span className="block text-right font-mono tabular-nums text-sm text-muted-foreground">
          ${info.getValue().toFixed(2)}
        </span>
      ),
      enableSorting: true,
    }),

    columnHelper.accessor("category", {
      header: "Category",
      cell: (info) => (
        <CategoryPill category={info.getValue()} onClick={onCategoryClick} />
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
