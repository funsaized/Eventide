"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data for demonstration
const mockTrades = [
  {
    id: "1",
    date: "2024-01-15",
    symbol: "KXNFLGAME-BUFKC-BUF",
    side: "YES",
    quantity: 100,
    price: 0.65,
    pnl: 35.0,
    category: "NFL",
    status: "CLOSED",
  },
  {
    id: "2",
    date: "2024-01-14",
    symbol: "KXFEDRATE-JAN24",
    side: "NO",
    quantity: 50,
    price: 0.45,
    pnl: -22.5,
    category: "Economics",
    status: "CLOSED",
  },
  {
    id: "3",
    date: "2024-01-13",
    symbol: "KXNBAGAME-LALGSW-LAL",
    side: "YES",
    quantity: 75,
    price: 0.72,
    pnl: null,
    category: "NBA",
    status: "OPEN",
  },
  {
    id: "4",
    date: "2024-01-12",
    symbol: "KXUSOPEN-DJOKOVIC",
    side: "YES",
    quantity: 200,
    price: 0.55,
    pnl: 90.0,
    category: "Tennis",
    status: "CLOSED",
  },
  {
    id: "5",
    date: "2024-01-11",
    symbol: "KXELECTION-2024",
    side: "NO",
    quantity: 150,
    price: 0.38,
    pnl: -57.0,
    category: "Politics",
    status: "CLOSED",
  },
];

const categoryColors: Record<string, string> = {
  NFL: "bg-blue-600",
  NBA: "bg-orange-500",
  Economics: "bg-green-600",
  Tennis: "bg-yellow-500",
  Politics: "bg-purple-600",
  Uncategorized: "bg-gray-500",
};

export default function TradesPage() {
  return (
    <div className="space-y-6">
      {/* Filter bar placeholder */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="text-sm text-muted-foreground">
            Filters will be implemented in Phase 11
          </div>
        </CardContent>
      </Card>

      {/* Trade table */}
      <Card>
        <CardHeader>
          <CardTitle>All Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-mono text-sm">
                      {trade.date}
                    </TableCell>
                    <TableCell className="max-w-48 truncate font-mono text-sm">
                      {trade.symbol}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          trade.side === "YES"
                            ? "border-profit text-profit"
                            : "border-loss text-loss"
                        }
                      >
                        {trade.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {trade.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      ${trade.price.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono tabular-nums ${
                        trade.pnl === null
                          ? "text-muted-foreground"
                          : trade.pnl >= 0
                            ? "text-profit"
                            : "text-loss"
                      }`}
                    >
                      {trade.pnl === null
                        ? "—"
                        : `${trade.pnl >= 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${categoryColors[trade.category]} text-white`}
                      >
                        {trade.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          trade.status === "OPEN" ? "secondary" : "outline"
                        }
                      >
                        {trade.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination placeholder */}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing 5 of 147 trades</span>
            <span>Pagination will be implemented in Phase 10</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
