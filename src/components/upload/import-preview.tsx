"use client";

/**
 * ImportPreview Component
 *
 * Displays a summary of parsed statement data before import.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ImportPreviewData {
  platform?: "robinhood" | "kalshi";
  accountNumber: string;
  statementDate: string;
  periodStart: string;
  periodEnd: string;

  tradeCount: number;
  closedPositionCount: number;
  openPositionCount: number;
  journalEntryCount: number;

  netLiquidity: number;
  endingCash: number;
  totalFees: number;
  grossPnl: number;
  duplicatesSkipped?: number;

  pnlValidation: {
    isValid: boolean;
    passCount: number;
    failCount: number;
    totalDiscrepancy: number;
  };

  warnings: string[];
}

export interface FilePreviewData extends ImportPreviewData {
  fileName: string;
}

export interface ImportPreviewProps {
  /** Parsed data to preview */
  data: ImportPreviewData;
  /** Whether import is in progress */
  isImporting?: boolean;
  /** Callback when import is confirmed */
  onImport: () => void;
  /** Callback when import is cancelled */
  onCancel: () => void;
  fileCount?: number;
  filePreviews?: FilePreviewData[];
  /** Custom class name */
  className?: string;
}

function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string | number;
  variant?: "default" | "positive" | "negative";
}) {
  return (
    <div className="p-3 bg-muted rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-mono font-semibold",
          variant === "positive" && "text-green-500",
          variant === "negative" && "text-red-500"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function ImportPreview({
  data,
  isImporting = false,
  onImport,
  onCancel,
  fileCount = 1,
  filePreviews,
  className,
}: ImportPreviewProps) {
  const platform = data.platform ?? "robinhood";
  const hasWarnings = data.warnings.length > 0;
  const hasPnlIssues = !data.pnlValidation.isValid;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Import Preview</CardTitle>
            <CardDescription>
              Review parsed data from {fileCount} file{fileCount !== 1 ? "s" : ""} before importing
            </CardDescription>
          </div>
          {platform === "kalshi" ? (
            <Badge variant="outline">Kalshi</Badge>
          ) : data.pnlValidation.isValid ? (
            <Badge className="bg-green-600">P&L Validated</Badge>
          ) : (
            <Badge variant="secondary">P&L Discrepancies</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statement Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Account:</span>
            <span className="ml-2 font-mono">{data.accountNumber}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Statement Date:</span>
            <span className="ml-2">{data.statementDate}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Period:</span>
            <span className="ml-2">
              {data.periodStart} to {data.periodEnd}
            </span>
          </div>
        </div>

        {platform === "kalshi" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Kalshi</Badge>
              <span className="text-sm text-muted-foreground">
                {data.periodStart} — {data.periodEnd}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Trades" value={data.tradeCount} />
              <StatCard label="Closed Positions" value={data.closedPositionCount} />
              <StatCard
                label="Total Fees"
                value={formatCurrency(data.totalFees)}
                variant={data.totalFees > 0 ? "negative" : "default"}
              />
              <StatCard
                label="Gross P&L"
                value={formatCurrency(data.grossPnl)}
                variant={data.grossPnl >= 0 ? "positive" : "negative"}
              />
              <StatCard
                label="Duplicates Skipped"
                value={data.duplicatesSkipped ?? 0}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Counts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Trades" value={data.tradeCount} />
              <StatCard label="Closed Positions" value={data.closedPositionCount} />
              <StatCard label="Open Positions" value={data.openPositionCount} />
              <StatCard label="Journal Entries" value={data.journalEntryCount} />
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Net Liquidity"
                value={formatCurrency(data.netLiquidity)}
              />
              <StatCard
                label="Ending Cash"
                value={formatCurrency(data.endingCash)}
              />
              <StatCard
                label="Total Fees"
                value={formatCurrency(data.totalFees)}
              />
              <StatCard
                label="Gross P&L"
                value={formatCurrency(data.grossPnl)}
                variant={data.grossPnl >= 0 ? "positive" : "negative"}
              />
            </div>

            {/* P&L Validation */}
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-2">P&L Validation</h4>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-500">
                  {data.pnlValidation.passCount} passed
                </span>
                <span className="text-muted-foreground">|</span>
                <span className={cn(data.pnlValidation.failCount > 0 && "text-yellow-500")}>
                  {data.pnlValidation.failCount} discrepancies
                </span>
                {data.pnlValidation.totalDiscrepancy > 0.01 && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-yellow-500">
                      Total: {formatCurrency(data.pnlValidation.totalDiscrepancy)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {filePreviews && filePreviews.length > 1 && (
          <FileBreakdownTable filePreviews={filePreviews} />
        )}

        {hasWarnings && (
          <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
            <h4 className="font-medium text-yellow-500 mb-2">
              Warnings ({data.warnings.length})
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-auto">
              {data.warnings.slice(0, 5).map((warning, i) => (
                <li key={i}>• {warning}</li>
              ))}
              {data.warnings.length > 5 && (
                <li className="text-yellow-500">
                  ... and {data.warnings.length - 5} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            onClick={onImport}
            disabled={isImporting}
            className="flex-1"
          >
            {isImporting ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Importing...
              </>
            ) : (
              `Import ${fileCount} Statement${fileCount !== 1 ? "s" : ""}`
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isImporting}
          >
            Cancel
          </Button>
        </div>

        {hasPnlIssues && (
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> P&L discrepancies are logged for review but
            won&apos;t block the import. Section 5 values are used as the source of truth.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FileBreakdownTable({ filePreviews }: { filePreviews: FilePreviewData[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span>Per-File Breakdown ({filePreviews.length} files)</span>
        <span className="text-muted-foreground text-xs">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded && (
        <div className="border-t overflow-auto max-h-64">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                <th className="text-left p-2 pl-4">File</th>
                <th className="text-left p-2">Platform</th>
                <th className="text-left p-2">Date</th>
                <th className="text-right p-2">Trades</th>
                <th className="text-right p-2">Closed</th>
                <th className="text-right p-2">Gross P&L</th>
                <th className="text-right p-2">Fees</th>
                <th className="text-right p-2 pr-4">P&L Valid</th>
              </tr>
            </thead>
            <tbody>
              {filePreviews.map((fp, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-2 pl-4 font-mono text-xs truncate max-w-[200px]">
                    {fp.fileName}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {fp.platform ?? "robinhood"}
                    </Badge>
                  </td>
                  <td className="p-2 whitespace-nowrap">{fp.statementDate}</td>
                  <td className="p-2 text-right font-mono">{fp.tradeCount}</td>
                  <td className="p-2 text-right font-mono">{fp.closedPositionCount}</td>
                  <td
                    className={cn(
                      "p-2 text-right font-mono",
                      fp.grossPnl >= 0 ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {formatCurrency(fp.grossPnl)}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {formatCurrency(fp.totalFees)}
                  </td>
                  <td className="p-2 text-right pr-4">
                    {fp.pnlValidation.isValid ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-yellow-500">
                        {fp.pnlValidation.failCount} issue{fp.pnlValidation.failCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
