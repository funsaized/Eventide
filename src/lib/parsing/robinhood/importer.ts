/**
 * Robinhood Platform Importer
 *
 * Implements the shared SourceImporter interface for Robinhood PDF statements.
 * Thin adapter around the existing Robinhood import pipeline.
 */

import { getTotalPnl } from "@/lib/calculations/fifo";
import { importerRegistry } from "@/lib/parsing/core";
import type {
  ImportOptions,
  ImportPreviewResult,
  ImportResult,
  ParseOptions,
  SourceImporter,
} from "@/lib/parsing/core";
import type { Platform } from "@/lib/db/types";

import { importStatement, parseDocument } from "./import-pipeline";
import { loadPDFFromFile } from "./pdf-loader";

function mapProgressPhase(phase: string): "PARSING" | "VALIDATING" | "PERSISTING" | "COMPLETE" | "FAILED" {
  switch (phase) {
    case "VALIDATING":
      return "VALIDATING";
    case "PERSISTING":
      return "PERSISTING";
    case "COMPLETE":
      return "COMPLETE";
    case "FAILED":
      return "FAILED";
    default:
      return "PARSING";
  }
}

export class RobinhoodImporter implements SourceImporter {
  readonly platform: Platform = "robinhood";

  async canHandle(file: File): Promise<boolean> {
    return file.name.toLowerCase().endsWith(".pdf");
  }

  async parseForPreview(file: File, options?: ParseOptions): Promise<ImportPreviewResult> {
    const verbose = options?.verbose ?? false;
    const document = await loadPDFFromFile(file, { verbose });
    const parsed = await parseDocument(document, verbose);
    const fifoTotals = getTotalPnl(parsed.fifoResults);

    return {
      platform: "robinhood",
      accountNumber: parsed.accountNumber,
      statementDate: parsed.statementDate,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      tradeCount: parsed.tradesWithFees.length,
      closedPositionCount: parsed.pairedPositions.length,
      openPositionCount: parsed.openPositions.length,
      cashFlowCount: parsed.journalEntries.length,
      totalFees: parsed.accountSummary.totalCommissionsAndFees ?? 0,
      grossPnl: parsed.accountSummary.grossProfitAndLoss ?? fifoTotals.grossPnl,
      netPnl: fifoTotals.netPnl,
      duplicatesSkipped: 0,
      warnings: parsed.warnings,
      platformData: {
        netLiquidity: parsed.accountSummary.netLiquidity ?? 0,
        endingCash: parsed.accountSummary.endingCashBalance ?? 0,
        pnlValidation: {
          isValid: parsed.pnlValidation.isValid,
          passCount: parsed.pnlValidation.passes.length,
          failCount: parsed.pnlValidation.failures.length,
          totalDiscrepancy: parsed.pnlValidation.totalDiscrepancy,
        },
      },
    };
  }

  async import(file: File, options?: ImportOptions): Promise<ImportResult> {
    const onProgress = options?.onProgress
      ? (phase: string, progress: number, message: string) => {
          options.onProgress?.(mapProgressPhase(phase), progress, message);
        }
      : undefined;

    const result = await importStatement(
      file,
      {
        skipDuplicateCheck: options?.skipDuplicateCheck,
        verbose: options?.verbose,
      },
      onProgress
    );

    return {
      success: result.success,
      importId: result.importId,
      platform: "robinhood",
      tradesImported: result.tradesImported,
      closedPositionsImported: result.closedPositionsImported,
      openPositionsImported: result.openPositionsImported,
      cashFlowsImported: result.cashFlowsImported,
      duplicatesSkipped: 0,
      warnings: [...result.validationWarnings, ...result.parsingWarnings],
      error: result.error,
      duplicateImport: result.duplicateImport,
    };
  }
}

importerRegistry.register(new RobinhoodImporter());
