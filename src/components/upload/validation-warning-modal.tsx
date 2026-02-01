"use client";

/**
 * ValidationWarningModal Component
 *
 * Modal for displaying P&L validation warnings before import.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ValidationFailure {
  symbol: string;
  calculatedPnl: number;
  reportedPnl: number;
  discrepancy: number;
}

export interface ValidationWarningModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Validation failures */
  failures: ValidationFailure[];
  /** Total discrepancy amount */
  totalDiscrepancy: number;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Callback when user proceeds anyway */
  onProceed: () => void;
}

function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function ValidationWarningModal({
  open,
  failures,
  totalDiscrepancy,
  onCancel,
  onProceed,
}: ValidationWarningModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-yellow-500">
            P&L Validation Warnings
          </DialogTitle>
          <DialogDescription>
            {failures.length} position{failures.length !== 1 ? "s" : ""} have
            P&L discrepancies between FIFO calculation and Section 5 values.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm">
              <span className="text-yellow-500 font-medium">
                Total Discrepancy: {formatCurrency(totalDiscrepancy)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Section 5 values will be used as the source of truth for P&L.
            </p>
          </div>

          <div className="h-64 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-right p-2">Calculated</th>
                  <th className="text-right p-2">Reported</th>
                  <th className="text-right p-2">Diff</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((f, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2 font-mono text-xs truncate max-w-[200px]">
                      {f.symbol}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {formatCurrency(f.calculatedPnl)}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {formatCurrency(f.reportedPnl)}
                    </td>
                    <td className="p-2 text-right font-mono text-yellow-500">
                      {formatCurrency(f.discrepancy)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>Why do discrepancies occur?</strong> Small differences may
            result from rounding, timing of trade settlement, or fee attribution.
            These are usually not significant.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel Import
          </Button>
          <Button onClick={onProceed}>
            Import Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
