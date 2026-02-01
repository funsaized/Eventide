"use client";

/**
 * ImportPreview Component
 *
 * Displays a summary of parsed statement data before import.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ImportPreviewData {
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

  pnlValidation: {
    isValid: boolean;
    passCount: number;
    failCount: number;
    totalDiscrepancy: number;
  };

  warnings: string[];
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
  /** Custom class name */
  className?: string;
}

function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
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
  className,
}: ImportPreviewProps) {
  const hasWarnings = data.warnings.length > 0;
  const hasPnlIssues = !data.pnlValidation.isValid;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Import Preview</CardTitle>
            <CardDescription>
              Review the parsed data before importing
            </CardDescription>
          </div>
          {data.pnlValidation.isValid ? (
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

        {/* Warnings */}
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
              "Import Statement"
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
            won't block the import. Section 5 values are used as the source of truth.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
