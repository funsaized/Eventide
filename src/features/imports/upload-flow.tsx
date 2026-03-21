"use client";

/**
 * UploadFlow Component
 *
 * Main orchestration component for the statement upload flow.
 * Handles: upload -> parse -> preview -> import -> redirect
 */

import { useState, useCallback, useRef } from "react";
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
  type FilePreviewData,
  type DuplicateInfo,
  type ValidationFailure,
} from "@/components/upload";
import { useToast } from "@/hooks/use-toast";
import { useImportStatement } from "@/hooks/use-import-statement";
import { useDemoTransition } from "@/hooks/use-demo-mode";
import { DemoTransitionModal } from "@/features/demo";
import { loadPDFFromFile } from "@/lib/parsing/pdf-loader";
import { parseDocument } from "@/lib/parsing/import-pipeline";
import { getTotalPnl } from "@/lib/calculations/fifo";
import type { ImportPhase, ImportResult } from "@/lib/parsing/import-pipeline";

type FlowState =
  | "IDLE"
  | "PARSING"
  | "PREVIEW"
  | "IMPORTING"
  | "COMPLETE"
  | "ERROR"
  | "DUPLICATE";

interface ImportTotals {
  filesImported: number;
  filesReplaced: number;
  tradesImported: number;
  closedPositionsImported: number;
  openPositionsImported: number;
  cashFlowsImported: number;
}

interface DuplicateContext {
  file: File;
  duplicate: DuplicateInfo;
  remainingFiles: File[];
  totals: ImportTotals;
}

type SequenceOutcome =
  | {
      kind: "success";
      totals: ImportTotals;
    }
  | {
      kind: "duplicate";
      file: File;
      duplicate: DuplicateInfo;
      remainingFiles: File[];
      totals: ImportTotals;
    }
  | {
      kind: "error";
      error: string;
      details: string[];
      totals: ImportTotals;
    };

function createEmptyTotals(): ImportTotals {
  return {
    filesImported: 0,
    filesReplaced: 0,
    tradesImported: 0,
    closedPositionsImported: 0,
    openPositionsImported: 0,
    cashFlowsImported: 0,
  };
}

function addImportResult(totals: ImportTotals, result: ImportResult): ImportTotals {
  return {
    ...totals,
    filesImported: totals.filesImported + 1,
    tradesImported: totals.tradesImported + (result.tradesImported ?? 0),
    closedPositionsImported:
      totals.closedPositionsImported + (result.closedPositionsImported ?? 0),
    openPositionsImported:
      totals.openPositionsImported + (result.openPositionsImported ?? 0),
    cashFlowsImported: totals.cashFlowsImported + (result.cashFlowsImported ?? 0),
  };
}

function dateRange(values: string[]): { start: string; end: string } {
  if (values.length === 0) {
    return { start: "-", end: "-" };
  }

  const sorted = [...values].sort((a, b) => a.localeCompare(b));
  return {
    start: sorted[0],
    end: sorted[sorted.length - 1],
  };
}

export function UploadFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    showModal: showDemoModal,
    checkDemoTransition,
    confirmTransition,
    cancelTransition,
  } = useDemoTransition();

  const [state, setState] = useState<FlowState>("IDLE");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [phase, setPhase] = useState<ImportPhase>("EXTRACTING");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [previewFileCount, setPreviewFileCount] = useState(1);
  const [filePreviews, setFilePreviews] = useState<FilePreviewData[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [duplicateContext, setDuplicateContext] = useState<DuplicateContext | null>(null);

  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationFailures, setValidationFailures] = useState<ValidationFailure[]>([]);
  const [validationTotalDiscrepancy, setValidationTotalDiscrepancy] = useState(0);

  const totalImportFilesRef = useRef(1);
  const currentImportFileIndexRef = useRef(0);
  const currentImportFileNameRef = useRef("");

  const importMutation = useImportStatement({
    onProgress: (p, prog, msg) => {
      setPhase(p);

      const totalFiles = totalImportFilesRef.current;
      if (totalFiles > 1) {
        const currentIndex = currentImportFileIndexRef.current;
        const totalProgress = Math.round(
          ((currentIndex + prog / 100) / totalFiles) * 100
        );
        setProgress(Math.min(totalProgress, 99));
        setMessage(
          `[${currentIndex + 1}/${totalFiles}] ${currentImportFileNameRef.current}: ${msg}`
        );
        return;
      }

      setProgress(prog);
      setMessage(msg);
    },
  });

  const finalizeSuccessfulImport = useCallback(
    (totals: ImportTotals) => {
      setPhase("COMPLETE");
      setProgress(100);
      setMessage("Import complete");
      setState("COMPLETE");

      const action =
        totals.filesReplaced > 0
          ? `Imported ${totals.filesImported} files and replaced ${totals.filesReplaced}`
          : `Imported ${totals.filesImported} files`;

      toast({
        title: "Import Successful",
        description: `${action}: ${totals.tradesImported} trades, ${totals.closedPositionsImported} closed positions`,
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    },
    [router, toast]
  );

  const parseFilesForPreview = useCallback(async (files: File[]) => {
    const previews: FilePreviewData[] = [];
    const allValidationFailures: ValidationFailure[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      setPhase("EXTRACTING");
      setProgress(Math.round((i / files.length) * 100));
      setMessage(`[${i + 1}/${files.length}] ${file.name}: extracting text from PDF...`);

      const document = await loadPDFFromFile(file);

      setPhase("PARSING_SECTIONS");
      setMessage(`[${i + 1}/${files.length}] ${file.name}: parsing sections...`);

      const parsed = await parseDocument(document);
      const fifoTotals = getTotalPnl(parsed.fifoResults);

      previews.push({
        fileName: file.name,
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
        warnings: parsed.warnings.map((warning) => `${file.name}: ${warning}`),
      });

      allValidationFailures.push(
        ...parsed.pnlValidation.failures.map((failure) => ({
          symbol: `${file.name}: ${failure.symbol}`,
          calculatedPnl: failure.calculatedPnl,
          reportedPnl: failure.reportedPnl,
          discrepancy: failure.discrepancy,
        }))
      );

      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    const accountNumbers = [...new Set(previews.map((p) => p.accountNumber))];
    const statementDates = dateRange(previews.map((p) => p.statementDate));
    const periodStarts = dateRange(previews.map((p) => p.periodStart));
    const periodEnds = dateRange(previews.map((p) => p.periodEnd));

    const aggregatePreview: ImportPreviewData = {
      accountNumber:
        accountNumbers.length === 1 ? accountNumbers[0] : "Multiple accounts",
      statementDate:
        statementDates.start === statementDates.end
          ? statementDates.start
          : `${statementDates.start} to ${statementDates.end}`,
      periodStart: periodStarts.start,
      periodEnd: periodEnds.end,
      tradeCount: previews.reduce((sum, p) => sum + p.tradeCount, 0),
      closedPositionCount: previews.reduce(
        (sum, p) => sum + p.closedPositionCount,
        0
      ),
      openPositionCount: previews.reduce((sum, p) => sum + p.openPositionCount, 0),
      journalEntryCount: previews.reduce((sum, p) => sum + p.journalEntryCount, 0),
      netLiquidity: previews.reduce((sum, p) => sum + p.netLiquidity, 0),
      endingCash: previews.reduce((sum, p) => sum + p.endingCash, 0),
      totalFees: previews.reduce((sum, p) => sum + p.totalFees, 0),
      grossPnl: previews.reduce((sum, p) => sum + p.grossPnl, 0),
      pnlValidation: {
        isValid: previews.every((p) => p.pnlValidation.isValid),
        passCount: previews.reduce((sum, p) => sum + p.pnlValidation.passCount, 0),
        failCount: previews.reduce((sum, p) => sum + p.pnlValidation.failCount, 0),
        totalDiscrepancy: previews.reduce(
          (sum, p) => sum + p.pnlValidation.totalDiscrepancy,
          0
        ),
      },
      warnings: previews.flatMap((p) => p.warnings),
    };

    setPreviewData(aggregatePreview);
    setPreviewFileCount(files.length);
    setFilePreviews(previews);
    setValidationFailures(allValidationFailures);
    setValidationTotalDiscrepancy(
      allValidationFailures.reduce((sum, failure) => sum + failure.discrepancy, 0)
    );
  }, []);

  const importFilesSequentially = useCallback(
    async (
      files: File[],
      initialTotals: ImportTotals,
      indexOffset: number,
      totalCount: number
    ): Promise<SequenceOutcome> => {
      let totals = { ...initialTotals };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        currentImportFileIndexRef.current = indexOffset + i;
        currentImportFileNameRef.current = file.name;
        totalImportFilesRef.current = totalCount;

        const result = await importMutation.mutateAsync({
          file,
          skipDuplicateCheck: false,
        });

        if (result.success) {
          totals = addImportResult(totals, result);
          continue;
        }

        if (result.duplicateImport) {
          return {
            kind: "duplicate",
            file,
            duplicate: result.duplicateImport,
            remainingFiles: files.slice(i + 1),
            totals,
          };
        }

        return {
          kind: "error",
          error: result.error ?? `Import failed for ${file.name}`,
          details: result.validationWarnings ?? [],
          totals,
        };
      }

      return { kind: "success", totals };
    },
    [importMutation]
  );

  const startParsing = useCallback(
    async (files: File[]) => {
      setSelectedFiles(files);
      setState("PARSING");
      setError(null);
      setErrorDetails([]);
      setDuplicateInfo(null);
      setDuplicateContext(null);

      try {
        await parseFilesForPreview(files);
        setPhase("COMPLETE");
        setProgress(100);
        setMessage(`Parsed ${files.length} file${files.length !== 1 ? "s" : ""}`);
        setState("PREVIEW");
      } catch (err) {
        console.error("Parse error:", err);
        setPhase("FAILED");
        setError(err instanceof Error ? err.message : "Unknown error");
        setState("ERROR");
      }
    },
    [parseFilesForPreview]
  );

  const handleFileSelect = useCallback(
    (files: File[]) => {
      checkDemoTransition(files, startParsing);
    },
    [checkDemoTransition, startParsing]
  );

  const handleImport = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setState("IMPORTING");
    setPhase("PERSISTING");
    setProgress(0);
    setMessage("Starting import...");

    const outcome = await importFilesSequentially(
      selectedFiles,
      createEmptyTotals(),
      0,
      selectedFiles.length
    );

    if (outcome.kind === "success") {
      finalizeSuccessfulImport(outcome.totals);
      return;
    }

    if (outcome.kind === "duplicate") {
      setDuplicateInfo(outcome.duplicate);
      setDuplicateContext({
        file: outcome.file,
        duplicate: outcome.duplicate,
        remainingFiles: outcome.remainingFiles,
        totals: outcome.totals,
      });
      setState("DUPLICATE");
      return;
    }

    setPhase("FAILED");
    setError(outcome.error);
    setErrorDetails(outcome.details);
    setState("ERROR");
  }, [selectedFiles, importFilesSequentially, finalizeSuccessfulImport]);

  const handleReplace = useCallback(async () => {
    if (!duplicateContext) return;

    setState("IMPORTING");
    setPhase("PERSISTING");
    setProgress(0);
    setMessage(`Replacing duplicate import for ${duplicateContext.file.name}...`);

    currentImportFileIndexRef.current = 0;
    currentImportFileNameRef.current = duplicateContext.file.name;
    totalImportFilesRef.current = duplicateContext.remainingFiles.length + 1;

    const replaceResult = await importMutation.mutateAsync({
      file: duplicateContext.file,
      skipDuplicateCheck: true,
    });

    if (!replaceResult.success) {
      setPhase("FAILED");
      setError(replaceResult.error ?? "Failed to replace duplicate import");
      setErrorDetails(replaceResult.validationWarnings ?? []);
      setState("ERROR");
      return;
    }

    const baseTotals = addImportResult(duplicateContext.totals, replaceResult);
    baseTotals.filesReplaced += 1;

    const outcome = await importFilesSequentially(
      duplicateContext.remainingFiles,
      baseTotals,
      1,
      duplicateContext.remainingFiles.length + 1
    );

    if (outcome.kind === "success") {
      finalizeSuccessfulImport(outcome.totals);
      return;
    }

    if (outcome.kind === "duplicate") {
      setDuplicateInfo(outcome.duplicate);
      setDuplicateContext({
        file: outcome.file,
        duplicate: outcome.duplicate,
        remainingFiles: outcome.remainingFiles,
        totals: outcome.totals,
      });
      setState("DUPLICATE");
      return;
    }

    setPhase("FAILED");
    setError(outcome.error);
    setErrorDetails(outcome.details);
    setState("ERROR");
  }, [duplicateContext, importMutation, importFilesSequentially, finalizeSuccessfulImport]);

  const handleReset = useCallback(() => {
    setState("IDLE");
    setSelectedFiles([]);
    setPreviewData(null);
    setPreviewFileCount(1);
    setFilePreviews([]);
    setError(null);
    setErrorDetails([]);
    setDuplicateInfo(null);
    setDuplicateContext(null);
    setPhase("EXTRACTING");
    setProgress(0);
    setMessage("");
    setValidationFailures([]);
    setValidationTotalDiscrepancy(0);
    setShowValidationWarning(false);
    totalImportFilesRef.current = 1;
    currentImportFileIndexRef.current = 0;
    currentImportFileNameRef.current = "";
    importMutation.reset();
  }, [importMutation]);

  return (
    <div className="space-y-6">
      {state === "IDLE" && (
        <FileUploader onFileSelect={handleFileSelect} />
      )}

      {state === "PARSING" && (
        <ParsingProgress
          phase={phase}
          progress={progress}
          message={message}
          steps={generateDefaultSteps(phase)}
        />
      )}

      {state === "PREVIEW" && previewData && (
        <ImportPreview
          data={previewData}
          fileCount={previewFileCount}
          filePreviews={filePreviews}
          onImport={handleImport}
          onCancel={handleReset}
        />
      )}

      {state === "IMPORTING" && (
        <ParsingProgress
          phase={phase}
          progress={progress}
          message={message}
          steps={generateDefaultSteps(phase)}
        />
      )}

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

      {state === "ERROR" && error && (
        <ParseErrorReport
          error={error}
          details={errorDetails}
          onRetry={handleReset}
        />
      )}

      {duplicateInfo && (
        <DuplicateModal
          open={state === "DUPLICATE"}
          duplicate={duplicateInfo}
          onCancel={handleReset}
          onReplace={handleReplace}
          isReplacing={importMutation.isPending}
        />
      )}

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

      <DemoTransitionModal
        open={showDemoModal}
        onCancel={cancelTransition}
        onConfirm={() => confirmTransition(startParsing)}
      />
    </div>
  );
}
