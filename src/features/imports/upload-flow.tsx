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
import { useImportStatement } from "@/hooks/use-import-statement";
import { loadPDFFromFile } from "@/lib/parsing/pdf-loader";
import { parseDocument } from "@/lib/parsing/import-pipeline";
import { getTotalPnl } from "@/lib/calculations/fifo";
import type { ImportPhase } from "@/lib/parsing/import-pipeline";

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

  // Import mutation with automatic query invalidation
  const importMutation = useImportStatement({
    onProgress: (p, prog, msg) => {
      setPhase(p);
      setProgress(prog);
      setMessage(msg);
    },
    onSuccess: (result) => {
      if (result.success) {
        setPhase("COMPLETE");
        setProgress(100);
        setState("COMPLETE");

        toast({
          title: "Import Successful",
          description: result.tradesImported
            ? `Imported ${result.tradesImported} trades, ${result.closedPositionsImported} closed positions`
            : "Statement replaced successfully",
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
        setErrorDetails(result.validationWarnings ?? []);
        setState("ERROR");
      }
    },
    onError: (err) => {
      console.error("Import error:", err);
      setPhase("FAILED");
      setError(err.message);
      setState("ERROR");
    },
  });

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setState("PARSING");
    setError(null);
    setErrorDetails([]);

    try {
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
  const handleImport = useCallback(() => {
    if (!selectedFile) return;

    setState("IMPORTING");
    setPhase("PERSISTING");
    setProgress(0);
    setMessage("Starting import...");

    importMutation.mutate({ file: selectedFile, skipDuplicateCheck: false });
  }, [selectedFile, importMutation]);

  /**
   * Handle duplicate replacement
   */
  const handleReplace = useCallback(() => {
    if (!selectedFile) return;

    setState("IMPORTING");
    setPhase("PERSISTING");
    setProgress(0);
    setMessage("Replacing existing import...");

    importMutation.mutate({ file: selectedFile, skipDuplicateCheck: true });
  }, [selectedFile, importMutation]);

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
    importMutation.reset();
  }, [importMutation]);

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
          isReplacing={importMutation.isPending}
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
