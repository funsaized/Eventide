"use client";

/**
 * Phase 6 Demo Page
 *
 * Upload a Robinhood Derivatives statement PDF to:
 * 1. Parse all sections
 * 2. Run FIFO P&L calculation
 * 3. Validate against Section 5 (source of truth)
 * 4. Optionally import into database
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { loadPDFFromFile } from "@/lib/parsing/pdf-loader";
import { parseDocument, importStatement } from "@/lib/parsing/import-pipeline";
import { setDebugLogging } from "@/lib/parsing/sections/parse-helpers";
import { getTotalPnl } from "@/lib/calculations/fifo";

interface ParseResult {
  // Metadata
  accountNumber: string;
  statementDate: string;
  periodStart: string;
  periodEnd: string;
  parseTimeMs: number;

  // Counts
  tradeCount: number;
  closedPositionCount: number;
  openPositionCount: number;
  journalEntryCount: number;

  // Account Summary
  netLiquidity: number;
  endingCash: number;
  totalFees: number;
  grossPnl: number;

  // FIFO Results
  fifoGrossPnl: number;
  fifoNetPnl: number;
  fifoTotalFees: number;

  // P&L Validation
  pnlValidation: {
    isValid: boolean;
    totalCalculatedPnl: number;
    totalReportedPnl: number;
    totalDiscrepancy: number;
    passCount: number;
    failCount: number;
    summary: string;
    failures: Array<{
      symbol: string;
      calculatedPnl: number;
      reportedPnl: number;
      discrepancy: number;
    }>;
  };

  // Fee Attribution
  feeAttribution: {
    totalFeesAttributed: number;
    totalFeesAvailable: number;
    unattributedFees: number;
    warnings: string[];
  };

  // Warnings
  warnings: string[];
}

export default function DemoParsePage() {
  const [status, setStatus] = useState<string>("Ready to parse");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setStatus("Error: Please select a PDF file");
      return;
    }

    setIsLoading(true);
    setStatus("Loading PDF...");
    setResult(null);
    setImportSuccess(null);
    setImportError(null);

    const startTime = performance.now();

    try {
      // Enable debug logging
      setDebugLogging(true);

      setStatus("Extracting text from PDF...");
      const document = await loadPDFFromFile(file, { verbose: true });

      console.log("=== EXTRACTED DOCUMENT ===");
      console.log(`Pages: ${document.pageCount}`);
      console.log(`Total text items: ${document.pages.reduce((sum, p) => sum + p.items.length, 0)}`);

      setStatus("Parsing sections and calculating P&L...");
      const parsed = await parseDocument(document, true);

      const parseTimeMs = Math.round(performance.now() - startTime);
      const fifoTotals = getTotalPnl(parsed.fifoResults);

      console.log("=== PARSED DATA ===");
      console.log("Account:", parsed.accountNumber);
      console.log("Period:", parsed.periodStart, "-", parsed.periodEnd);
      console.log("Trades with fees:", parsed.tradesWithFees.length);
      console.log("Paired positions:", parsed.pairedPositions.length);
      console.log("Journal entries:", parsed.journalEntries.length);
      console.log("Open positions:", parsed.openPositions.length);
      console.log("FIFO results:", parsed.fifoResults.size);
      console.log("P&L validation:", parsed.pnlValidation);
      console.log("Fee attribution:", parsed.feeAttribution);

      // Build result for display
      const displayResult: ParseResult = {
        accountNumber: parsed.accountNumber,
        statementDate: parsed.statementDate,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        parseTimeMs,

        tradeCount: parsed.tradesWithFees.length,
        closedPositionCount: parsed.pairedPositions.length,
        openPositionCount: parsed.openPositions.length,
        journalEntryCount: parsed.journalEntries.length,

        netLiquidity: parsed.accountSummary.netLiquidity ?? 0,
        endingCash: parsed.accountSummary.endingCashBalance ?? 0,
        totalFees: parsed.accountSummary.totalCommissionsAndFees ?? 0,
        grossPnl: parsed.accountSummary.grossProfitAndLoss ?? 0,

        fifoGrossPnl: fifoTotals.grossPnl,
        fifoNetPnl: fifoTotals.netPnl,
        fifoTotalFees: fifoTotals.fees,

        pnlValidation: {
          isValid: parsed.pnlValidation.isValid,
          totalCalculatedPnl: parsed.pnlValidation.totalCalculatedPnl,
          totalReportedPnl: parsed.pnlValidation.totalReportedPnl,
          totalDiscrepancy: parsed.pnlValidation.totalDiscrepancy,
          passCount: parsed.pnlValidation.passes.length,
          failCount: parsed.pnlValidation.failures.length,
          summary: parsed.pnlValidation.summary,
          failures: parsed.pnlValidation.failures.map(f => ({
            symbol: f.symbol,
            calculatedPnl: f.calculatedPnl,
            reportedPnl: f.reportedPnl,
            discrepancy: f.discrepancy,
          })),
        },

        feeAttribution: {
          totalFeesAttributed: parsed.feeAttribution.totalFeesAttributed,
          totalFeesAvailable: parsed.feeAttribution.totalFeesAvailable,
          unattributedFees: parsed.feeAttribution.unattributedFees,
          warnings: parsed.feeAttribution.warnings,
        },

        warnings: parsed.warnings,
      };

      setResult(displayResult);
      setStatus("Parsing complete! Review results below.");

      // Disable debug logging
      setDebugLogging(false);
    } catch (error) {
      console.error("Parse error:", error);
      setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImport = useCallback(async (file: File) => {
    setIsImporting(true);
    setImportError(null);

    try {
      const importResult = await importStatement(file, { verbose: true }, (phase, progress, message) => {
        setStatus(`${phase}: ${message} (${Math.round(progress * 100)}%)`);
      });

      if (importResult.success) {
        setImportSuccess(true);
        setStatus(`Import successful! Import ID: ${importResult.importId}`);
        console.log("=== IMPORT RESULT ===");
        console.log("Import ID:", importResult.importId);
        console.log("Trades imported:", importResult.tradesImported);
        console.log("Closed positions:", importResult.closedPositionsImported);
        console.log("Cash flows:", importResult.cashFlowsImported);
        console.log("Open positions:", importResult.openPositionsImported);
      } else {
        setImportSuccess(false);
        setImportError(importResult.error || "Unknown import error");
        setStatus("Import failed");
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportSuccess(false);
      setImportError(error instanceof Error ? error.message : "Unknown error");
      setStatus("Import failed");
    } finally {
      setIsImporting(false);
    }
  }, []);

  const formatCurrency = (value: number) => {
    const sign = value < 0 ? "-" : "";
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Phase 6 Demo: Complete Import Pipeline</CardTitle>
          <CardDescription>
            Upload a Robinhood Derivatives statement to test parsing, FIFO P&L calculation,
            validation against Section 5, and database import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isLoading || isImporting}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                disabled:opacity-50"
            />
          </div>

          <div className="text-sm font-medium flex items-center gap-2">
            Status:
            <span className={isLoading || isImporting ? "text-yellow-500" : "text-muted-foreground"}>
              {status}
            </span>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="validation">P&L Validation</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parse Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Account:</span>
                    <span className="ml-2 font-mono">{result.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Period:</span>
                    <span className="ml-2">{result.periodStart} to {result.periodEnd}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Parse Time:</span>
                    <span className="ml-2">{result.parseTimeMs}ms</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Counts</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <div className="text-muted-foreground">Trades</div>
                      <div className="text-lg font-bold">{result.tradeCount}</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="text-muted-foreground">Closed Positions</div>
                      <div className="text-lg font-bold">{result.closedPositionCount}</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="text-muted-foreground">Open Positions</div>
                      <div className="text-lg font-bold">{result.openPositionCount}</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="text-muted-foreground">Journal Entries</div>
                      <div className="text-lg font-bold">{result.journalEntryCount}</div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Account Summary (Section 10)</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Net Liquidity:</span>
                      <span className="ml-2 font-mono">{formatCurrency(result.netLiquidity)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ending Cash:</span>
                      <span className="ml-2 font-mono">{formatCurrency(result.endingCash)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Fees:</span>
                      <span className="ml-2 font-mono">{formatCurrency(result.totalFees)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gross P&L:</span>
                      <span className={`ml-2 font-mono ${result.grossPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatCurrency(result.grossPnl)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">FIFO Calculation</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Gross P&L:</span>
                      <span className={`ml-2 font-mono ${result.fifoGrossPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatCurrency(result.fifoGrossPnl)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fees:</span>
                      <span className="ml-2 font-mono">{formatCurrency(result.fifoTotalFees)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Net P&L:</span>
                      <span className={`ml-2 font-mono ${result.fifoNetPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatCurrency(result.fifoNetPnl)}
                      </span>
                    </div>
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Warnings ({result.warnings.length})</h4>
                    <ul className="text-sm text-yellow-600 space-y-1">
                      {result.warnings.slice(0, 10).map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                      {result.warnings.length > 10 && (
                        <li>... and {result.warnings.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  P&L Validation vs Section 5
                  {result.pnlValidation.isValid ? (
                    <Badge variant="default" className="bg-green-600">VALID</Badge>
                  ) : (
                    <Badge variant="destructive">DISCREPANCIES</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Section 5 is the source of truth. We compare FIFO-calculated P&L against it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Calculated (FIFO):</span>
                    <span className="ml-2 font-mono">{formatCurrency(result.pnlValidation.totalCalculatedPnl)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reported (Section 5):</span>
                    <span className="ml-2 font-mono">{formatCurrency(result.pnlValidation.totalReportedPnl)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Discrepancy:</span>
                    <span className={`ml-2 font-mono ${result.pnlValidation.totalDiscrepancy > 0.01 ? "text-yellow-500" : ""}`}>
                      {formatCurrency(result.pnlValidation.totalDiscrepancy)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Positions:</span>
                    <span className="ml-2">
                      <span className="text-green-500">{result.pnlValidation.passCount} pass</span>
                      {" / "}
                      <span className="text-red-500">{result.pnlValidation.failCount} fail</span>
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded text-sm">
                  {result.pnlValidation.summary}
                </div>

                {result.pnlValidation.failures.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Discrepancies</h4>
                    <div className="overflow-auto max-h-64">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Symbol</th>
                            <th className="text-right p-2">Calculated</th>
                            <th className="text-right p-2">Reported</th>
                            <th className="text-right p-2">Diff</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.pnlValidation.failures.map((f, i) => (
                            <tr key={i} className="border-b">
                              <td className="p-2 font-mono text-xs">{f.symbol.slice(0, 30)}</td>
                              <td className="p-2 text-right font-mono">{formatCurrency(f.calculatedPnl)}</td>
                              <td className="p-2 text-right font-mono">{formatCurrency(f.reportedPnl)}</td>
                              <td className="p-2 text-right font-mono text-yellow-500">{formatCurrency(f.discrepancy)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fee Attribution</CardTitle>
                <CardDescription>
                  Fees from Section 3 distributed to individual trades proportionally.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded">
                    <div className="text-muted-foreground">Available (Section 3)</div>
                    <div className="text-lg font-mono">{formatCurrency(result.feeAttribution.totalFeesAvailable)}</div>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <div className="text-muted-foreground">Attributed</div>
                    <div className="text-lg font-mono">{formatCurrency(result.feeAttribution.totalFeesAttributed)}</div>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <div className="text-muted-foreground">Unattributed</div>
                    <div className={`text-lg font-mono ${result.feeAttribution.unattributedFees > 0.01 ? "text-yellow-500" : ""}`}>
                      {formatCurrency(result.feeAttribution.unattributedFees)}
                    </div>
                  </div>
                </div>

                {result.feeAttribution.warnings.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Fee Attribution Warnings</h4>
                    <ul className="text-sm text-yellow-600 space-y-1">
                      {result.feeAttribution.warnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Database Import</CardTitle>
                <CardDescription>
                  Import the parsed statement into the local SQLite database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {importSuccess === null && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Click Import to save this statement to the database. The data will be stored in your browser
                      using OPFS (Origin Private File System) and will persist across sessions.
                    </p>
                    <Button
                      onClick={() => {
                        const input = document.getElementById("file-input") as HTMLInputElement;
                        if (input?.files?.[0]) {
                          handleImport(input.files[0]);
                        }
                      }}
                      disabled={isImporting}
                    >
                      {isImporting ? "Importing..." : "Import to Database"}
                    </Button>
                  </div>
                )}

                {importSuccess === true && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded text-green-500">
                    ✓ Statement imported successfully! Check the Trades and Dashboard pages.
                  </div>
                )}

                {importSuccess === false && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded text-red-500">
                    ✗ Import failed: {importError}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  <p><strong>Note:</strong> Duplicate statements (same account + date) will be rejected.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground space-y-2">
            <p><strong>What this demo tests:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Section 2, 3, 4, 5, 6, 7, 10 parsing</li>
              <li>FIFO cost basis calculation</li>
              <li>P&L validation against Section 5 (source of truth)</li>
              <li>Fee attribution from Section 3 to trades</li>
              <li>Database persistence with duplicate detection</li>
            </ul>
            <p className="mt-2"><strong>Tip:</strong> Open DevTools (F12) → Console to see detailed logging.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
