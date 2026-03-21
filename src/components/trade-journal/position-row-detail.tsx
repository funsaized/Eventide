"use client";

import { usePositionTrades } from "@/hooks/use-positions-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PnLBadge } from "./pnl-badge";
import { SideBadge } from "./side-badge";
import { StatusBadge } from "./status-badge";

interface PositionRowDetailProps {
  symbol: string;
  colSpan: number;
}

export function PositionRowDetail({ symbol, colSpan }: PositionRowDetailProps) {
  const { data: trades, isLoading, isError } = usePositionTrades(symbol, true);

  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-0">
        <div className="bg-muted/30 border-t border-l-2 border-l-primary/20">
          {isLoading && (
            <div className="p-4 text-sm text-muted-foreground">
              Loading trades...
            </div>
          )}
          {isError && (
            <div className="p-4 text-sm text-destructive">
              Failed to load trades.
            </div>
          )}
          {!isLoading && !isError && (!trades || trades.length === 0) && (
            <div className="p-4 text-sm text-muted-foreground">
              No trades found.
            </div>
          )}
          {!isLoading && !isError && trades && trades.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-mono text-xs">
                      {trade.trade_date}
                    </TableCell>
                    <TableCell>
                      <SideBadge side={trade.side} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs">
                      {trade.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs">
                      ${trade.price.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right">
                      <PnLBadge value={trade.pnl} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs text-muted-foreground">
                      ${trade.fees.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={trade.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
