/**
 * CSV Export Utility
 *
 * Exports trade journal rows to a downloadable CSV file.
 */

import type { TradeJournalRow } from "../db/types";

/**
 * Column definitions for the CSV export
 */
const CSV_COLUMNS = [
  { header: "Date", accessor: (row: TradeJournalRow) => row.trade_date },
  { header: "Symbol", accessor: (row: TradeJournalRow) => row.symbol },
  { header: "Side", accessor: (row: TradeJournalRow) => row.side },
  { header: "Quantity", accessor: (row: TradeJournalRow) => String(row.quantity) },
  { header: "Price", accessor: (row: TradeJournalRow) => row.price.toFixed(4) },
  { header: "Fees", accessor: (row: TradeJournalRow) => row.fees.toFixed(2) },
  {
    header: "P&L",
    accessor: (row: TradeJournalRow) =>
      row.pnl != null ? row.pnl.toFixed(2) : "",
  },
  { header: "Category", accessor: (row: TradeJournalRow) => row.category ?? "" },
  { header: "Status", accessor: (row: TradeJournalRow) => row.status },
  {
    header: "Settlement Date",
    accessor: (row: TradeJournalRow) => row.settlement_date ?? "",
  },
  {
    header: "Settlement Price",
    accessor: (row: TradeJournalRow) =>
      row.settlement_price != null ? row.settlement_price.toFixed(4) : "",
  },
] as const;

/**
 * Escape a CSV field value (handles commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert trade journal rows to CSV string
 */
export function tradesToCSV(trades: TradeJournalRow[]): string {
  const headerRow = CSV_COLUMNS.map((col) => escapeCSV(col.header)).join(",");

  const dataRows = trades.map((trade) =>
    CSV_COLUMNS.map((col) => escapeCSV(col.accessor(trade))).join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Download a CSV string as a file
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export trade journal rows to a CSV file download
 */
export function exportTradesToCSV(trades: TradeJournalRow[]): void {
  const csv = tradesToCSV(trades);
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadCSV(csv, `rubbin-hood-trades-${timestamp}.csv`);
}
