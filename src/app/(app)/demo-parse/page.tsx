"use client";

/**
 * Phase 5 Demo Page
 *
 * Upload a Robinhood Derivatives statement PDF and see parsed output.
 * Includes LLM-friendly export for debugging.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LLMExport {
  metadata: {
    parserVersion: string;
    parseTimeMs: number;
    documentInfo: {
      pageCount: number;
      totalTextItems: number;
    };
    versionDetection: unknown;
  };
  accountSummary: unknown;
  trades: {
    total: number;
    sample: unknown[];
    allTrades: unknown[];
  };
  closedPositions: {
    total: number;
    positions: unknown[];
  };
  openPositions: {
    total: number;
    positions: unknown[];
  };
  journalEntries: {
    total: number;
    entries: unknown[];
  };
  warnings: string[];
  rawTextSamples: {
    description: string;
    pages: Array<{
      pageNumber: number;
      itemCount: number;
      sampleItems: Array<{
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
      fullText: string;
    }>;
  };
}

export default function DemoParsePage() {
  const [status, setStatus] = useState<string>("Ready to parse");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [llmExport, setLlmExport] = useState<LLMExport | null>(null);
  const [showJson, setShowJson] = useState(false);

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
    setLlmExport(null);

    try {
      // Dynamic import to avoid SSR issues with pdf.js
      const { loadPDFFromFile } = await import("@/lib/parsing/pdf-loader");
      const { detectVersion } = await import("@/lib/parsing/version-detector");
      const { parseStatement } = await import("@/lib/parsing/registry");
      const { parserV1 } = await import("@/lib/parsing/parsers/v1.0");

      // Register the v1.0 parser
      const { parserRegistry } = await import("@/lib/parsing/registry");
      parserRegistry.register(parserV1);

      setStatus("Extracting text from PDF...");
      const document = await loadPDFFromFile(file, { verbose: true });

      console.log("=== EXTRACTED DOCUMENT ===");
      console.log(`Pages: ${document.pageCount}`);
      console.log(`Total text items: ${document.pages.reduce((sum, p) => sum + p.items.length, 0)}`);

      setStatus("Detecting statement version...");
      const versionResult = detectVersion(document);
      console.log("=== VERSION DETECTION ===");
      console.log(versionResult);

      setStatus("Parsing statement...");
      const parseResult = await parseStatement(document);

      console.log("=== PARSE RESULT ===");
      console.log(parseResult);

      const stmt = parseResult.statement;

      console.log("=== TRADES ===");
      console.table(stmt.trades.slice(0, 20)); // First 20 trades

      console.log("=== CLOSED POSITIONS ===");
      console.table(stmt.closedPositions);

      console.log("=== ACCOUNT SUMMARY ===");
      console.log(stmt.accountSummary);

      console.log("=== WARNINGS ===");
      console.log(stmt.warnings);

      // Build LLM-friendly export
      const exportData: LLMExport = {
        metadata: {
          parserVersion: parseResult.parserVersion,
          parseTimeMs: parseResult.parseTimeMs,
          documentInfo: {
            pageCount: document.pageCount,
            totalTextItems: document.pages.reduce((sum, p) => sum + p.items.length, 0),
          },
          versionDetection: versionResult,
        },
        accountSummary: stmt.accountSummary,
        trades: {
          total: stmt.trades.length,
          sample: stmt.trades.slice(0, 10),
          allTrades: stmt.trades,
        },
        closedPositions: {
          total: stmt.closedPositions.length,
          positions: stmt.closedPositions,
        },
        openPositions: {
          total: stmt.openPositions.length,
          positions: stmt.openPositions,
        },
        journalEntries: {
          total: stmt.journalEntries.length,
          entries: stmt.journalEntries,
        },
        warnings: stmt.warnings,
        rawTextSamples: {
          description: "Raw PDF text items by page for debugging. Each page shows first 50 items and concatenated text.",
          pages: document.pages.map(page => ({
            pageNumber: page.pageNumber,
            itemCount: page.items.length,
            sampleItems: page.items.slice(0, 50).map(item => ({
              text: item.text,
              x: Math.round(item.x * 100) / 100,
              y: Math.round(item.y * 100) / 100,
              width: Math.round(item.width * 100) / 100,
              height: Math.round(item.height * 100) / 100,
            })),
            fullText: page.items.map(item => item.text).join(" "),
          })),
        },
      };

      setLlmExport(exportData);

      // Build summary for display
      const summary = [
        `Parser Version: ${parseResult.parserVersion}`,
        `Parse Time: ${parseResult.parseTimeMs}ms`,
        `Account: ${stmt.accountSummary.accountNumber || "N/A"}`,
        `Period: ${stmt.accountSummary.periodStart} to ${stmt.accountSummary.periodEnd}`,
        ``,
        `Trades Found: ${stmt.trades.length}`,
        `Closed Positions: ${stmt.closedPositions.length}`,
        `Open Positions: ${stmt.openPositions.length}`,
        `Journal Entries: ${stmt.journalEntries.length}`,
        ``,
        `Net Liquidity: $${stmt.accountSummary.netLiquidity.toFixed(2)}`,
        `Total Fees: $${stmt.accountSummary.totalFees.toFixed(2)}`,
        ``,
        `Warnings: ${stmt.warnings.length}`,
        ...stmt.warnings.map(w => `  - ${w}`),
      ].join("\n");

      setResult(summary);
      setStatus("Parsing complete! Check browser console for details.");
    } catch (error) {
      console.error("Parse error:", error);
      setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setResult(null);
      setLlmExport(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const copyToClipboard = useCallback(() => {
    if (llmExport) {
      navigator.clipboard.writeText(JSON.stringify(llmExport, null, 2));
      alert("Copied to clipboard!");
    }
  }, [llmExport]);

  const downloadJson = useCallback(() => {
    if (llmExport) {
      const blob = new Blob([JSON.stringify(llmExport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parsed-statement-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [llmExport]);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Phase 5 Demo: PDF Parser</CardTitle>
          <CardDescription>
            Upload a Robinhood Derivatives monthly statement PDF to test the section parsers.
            Results will be logged to the browser console.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isLoading}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                disabled:opacity-50"
            />
          </div>

          <div className="text-sm font-medium">
            Status: <span className={isLoading ? "text-yellow-500" : "text-muted-foreground"}>{status}</span>
          </div>

          {result && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Parse Summary:</h3>
              <pre className="p-4 bg-muted rounded-md text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                {result}
              </pre>
            </div>
          )}

          {llmExport && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">LLM Export:</h3>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  Copy JSON
                </Button>
                <Button variant="outline" size="sm" onClick={downloadJson}>
                  Download JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowJson(!showJson)}>
                  {showJson ? "Hide" : "Show"} JSON
                </Button>
              </div>

              {showJson && (
                <pre className="p-4 bg-muted rounded-md text-xs overflow-auto max-h-[600px] whitespace-pre-wrap">
                  {JSON.stringify(llmExport, null, 2)}
                </pre>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-4">
            <p><strong>Tip:</strong> Open browser DevTools (F12) → Console tab to see detailed parsed data.</p>
            <p className="mt-1">The parser extracts:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Section 2: Monthly Trade Confirmations (individual trades)</li>
              <li>Section 4: Purchase and Sale (with prior-month trades)</li>
              <li>Section 5: Purchase and Sale Summary (P&L source of truth)</li>
              <li>Section 10: Account Summary (net liquidity, fees)</li>
            </ul>
            <p className="mt-2"><strong>LLM Export:</strong> Use &quot;Copy JSON&quot; to get structured data for AI analysis and debugging.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
