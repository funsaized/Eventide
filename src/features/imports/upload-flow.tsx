"use client";

/**
 * UploadFlow Component
 *
 * Main orchestration component for the statement upload flow.
 * Handles: upload -> parse -> preview -> import -> redirect
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileUploader,
  ParsingProgress,
  ImportPreview,
  ParseErrorReport,
  DuplicateModal,
  ValidationWarningModal,
  generateDefaultSteps,
  type ImportPreviewData,
  type DuplicateInfo,
  type ValidationFailure,
} from "@/components/upload";
import { useToast } from "@/hooks/use-toast";
import type { ImportPhase, ImportResult } from "@/lib/parsing/import-pipeline";

type FlowState =
  | "IDLE"
  | "PARSING"
  | "PREVIEW"
  | "IMPORTING"
  | "COMPLETE"
  | "ERROR"
  | "DUPLICATE";

export function UploadFlow() {
  const router = useRouter();
  const { toast } = useToast();

  // Flow state
  const [state, setState] = useState<FlowState>("IDLE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Parsing state
  const [phase, setPhase] = useState<ImportPhase>("EXTRACTING");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  // Preview state
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  // Duplicate state
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);

  // Validation warning state
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationFailures, setValidationFailures] = useState<ValidationFailure[]>([]);
  const [validationTotalDiscrepancy, setValidationTotalDiscrepancy] = useState(0);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setState("PARSING");
    setError(null);
    setErrorDetails([]);

    try {
      // Dynamic imports to avoid SSR issues
      const { loadPDFFromFile } = await import("@/lib/parsing/pdf-loader");
      const { parseDocument } = await import("@/lib/parsing/import-pipeline");
      const { getTotalPnl } = await import("@/lib/calculations/fifo");

      // Phase 1: Extract PDF
      setPhase("EXTRACTING");
      setProgress(10);
      setMessage("Extracting text from PDF...");

      const document = await loadPDFFromFile(file);

      // Phase 2: Parse document
      setPhase("PARSING_SECTIONS");
      setProgress(40);
      setMessage("Parsing sections...");

      const parsed = await parseDocument(document);
      const fifoTotals = getTotalPnl(parsed.fifoResults);

      // Build preview data
      const preview: ImportPreviewData = {
        accountNumber: parsed.accountNumber,
        statementDate: parsed.statementDate,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        tradeCount: parsed.tradesWithFees.length,
        closedPositionCount: parsed.pairedPositions.length,
        openPositionCount: parsed.openPositions.length,
        journalEntryCount: parsed.journalEntries.length,
        netLiquidity: parsed.accountSummary.netLiquidity ?? 0,
        endingCash: parsed.accountSummary.endingCashBalance ?? 0,
        totalFees: parsed.accountSummary.totalCommissionsAndFees ?? 0,
        grossPnl: parsed.accountSummary.grossProfitAndLoss ?? fifoTotals.grossPnl,
        pnlValidation: {
          isValid: parsed.pnlValidation.isValid,
          passCount: parsed.pnlValidation.passes.length,
          failCount: parsed.pnlValidation.failures.length,
          totalDiscrepancy: parsed.pnlValidation.totalDiscrepancy,
        },
        warnings: parsed.warnings,
      };

      setPreviewData(preview);
      setPhase("COMPLETE");
      setProgress(100);
      setMessage("Parsing complete");
      setState("PREVIEW");

      // Store validation failures for potential warning display
      if (parsed.pnlValidation.failures.length > 0) {
        setValidationFailures(
          parsed.pnlValidation.failures.map((f) => ({
            symbol: f.symbol,
            calculatedPnl: f.calculatedPnl,
            reportedPnl: f.reportedPnl,
            discrepancy: f.discrepancy,
          }))
        );
        setValidationTotalDiscrepancy(parsed.pnlValidation.totalDiscrepancy);
      }
    } catch (err) {
      console.error("Parse error:", err);
      setPhase("FAILED");
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("ERROR");
    }
  }, []);

  /**
   * Handle import confirmation
   */
  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setState("IMPORTING");
    setPhase("PERSISTING");
    setProgress(0);
    setMessage("Starting import...");

    try {
      const { importStatement } = await import("@/lib/parsing/import-pipeline");

      const result: ImportResult = await importStatement(
        selectedFile,
        { verbose: false },
        (p, prog, msg) => {
          setPhase(p);
          setProgress(prog);
          setMessage(msg);
        }
      );

      if (result.success) {
        setPhase("COMPLETE");
        setProgress(100);
        setState("COMPLETE");

        toast({
          title: "Import Successful",
          description: `Imported ${result.tradesImported} trades, ${result.closedPositionsImported} closed positions`,
        });

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else if (result.duplicateImport) {
        setDuplicateInfo(result.duplicateImport);
        setState("DUPLICATE");
      } else {
        setPhase("FAILED");
        setError(result.error ?? "Import failed");
        setErrorDetails(result.validationWarnings);
        setState("ERROR");
      }
    } catch (err) {
      console.error("Import error:", err);
      setPhase("FAILED");
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("ERROR");
    }
  }, [selectedFile, router, toast]);

  /**
   * Handle duplicate replacement
   */
  const handleReplace = useCallback(async () => {
    if (!selectedFile) return;

    setState("IMPORTING");

    try {
      const { importStatement } = await import("@/lib/parsing/import-pipeline");

      const result: ImportResult = await importStatement(
        selectedFile,
        { skipDuplicateCheck: true, verbose: false },
        (p, prog, msg) => {
          setPhase(p);
          setProgress(prog);
          setMessage(msg);
        }
      );

      if (result.success) {
        setState("COMPLETE");
        toast({
          title: "Import Successful",
          description: "Statement replaced successfully",
        });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setError(result.error ?? "Replace failed");
        setState("ERROR");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("ERROR");
    }
  }, [selectedFile, router, toast]);

  /**
   * Reset to initial state
   */
  const handleReset = useCallback(() => {
    setState("IDLE");
    setSelectedFile(null);
    setPreviewData(null);
    setError(null);
    setErrorDetails([]);
    setDuplicateInfo(null);
    setPhase("EXTRACTING");
    setProgress(0);
    setMessage("");
  }, []);

  return (
    <div className="space-y-6">
      {/* File Upload */}
      {state === "IDLE" && (
        <FileUploader onFileSelect={handleFileSelect} />
      )}

      {/* Parsing Progress */}
      {state === "PARSING" && (
        <ParsingProgress
          phase={phase}
          progress={progress}
          message={message}
          steps={generateDefaultSteps(phase)}
        />
      )}

      {/* Import Preview */}
      {state === "PREVIEW" && previewData && (
        <ImportPreview
          data={previewData}
          onImport={handleImport}
          onCancel={handleReset}
        />
      )}

      {/* Importing Progress */}
      {state === "IMPORTING" && (
        <ParsingProgress
          phase={phase}
          progress={progress}
          message={message}
          steps={generateDefaultSteps(phase)}
        />
      )}

      {/* Success State */}
      {state === "COMPLETE" && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-green-500 mb-2">
            Import Complete!
          </h2>
          <p className="text-muted-foreground">
            Redirecting to dashboard...
          </p>
        </div>
      )}

      {/* Error State */}
      {state === "ERROR" && error && (
        <ParseErrorReport
          error={error}
          details={errorDetails}
          onRetry={handleReset}
        />
      )}

      {/* Duplicate Modal */}
      {duplicateInfo && (
        <DuplicateModal
          open={state === "DUPLICATE"}
          duplicate={duplicateInfo}
          onCancel={handleReset}
          onReplace={handleReplace}
          isReplacing={state === "IMPORTING"}
        />
      )}

      {/* Validation Warning Modal */}
      <ValidationWarningModal
        open={showValidationWarning}
        failures={validationFailures}
        totalDiscrepancy={validationTotalDiscrepancy}
        onCancel={() => setShowValidationWarning(false)}
        onProceed={() => {
          setShowValidationWarning(false);
          handleImport();
        }}
      />
    </div>
  );
}
