"use client";

/**
 * UploadFlow Component
 *
 * Main orchestration component for the statement upload flow.
 * Handles: upload -> parse -> preview -> import -> redirect
 */

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import "@/lib/parsing/register";
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
import { useDemoTransition } from "@/hooks/use-demo-mode";
import { DemoTransitionModal } from "@/features/demo";
import { importerRegistry } from "@/lib/parsing/core";
import { queryKeys } from "@/lib/state/query-client";

import type {
  ImportPhase,
  ImportPreviewResult,
  ImportResult,
} from "@/lib/parsing/core";

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

const UNRECOGNIZED_FILE_FORMAT_ERROR = "Unrecognized file format";

interface PreviewPnlValidation {
  isValid: boolean;
  passCount: number;
  failCount: number;
  totalDiscrepancy: number;
}

interface PreviewValidationFailure {
  symbol: string;
  calculatedPnl: number;
  reportedPnl: number;
  discrepancy: number;
}

interface PreviewPlatformData {
  netLiquidity?: number;
  endingCash?: number;
  pnlValidation?: PreviewPnlValidation;
  pnlValidationFailures?: PreviewValidationFailure[];
}

function getPreviewPlatformData(platformData: unknown): PreviewPlatformData {
  if (!platformData || typeof platformData !== "object") {
    return {};
  }

  return platformData as PreviewPlatformData;
}

function getPreviewPnlValidation(platformData: PreviewPlatformData): PreviewPnlValidation {
  return (
    platformData.pnlValidation ?? {
      isValid: true,
      passCount: 0,
      failCount: 0,
      totalDiscrepancy: 0,
    }
  );
}

function getImportPreviewPlatform(
  platform: ImportPreviewResult["platform"]
): ImportPreviewData["platform"] {
  if (platform === "robinhood" || platform === "kalshi") {
    return platform;
  }

  return undefined;
}

function mapToFilePreviewData(
  fileName: string,
  result: ImportPreviewResult
): FilePreviewData {
  const platformData = getPreviewPlatformData(result.platformData);

  return {
    fileName,
    platform: getImportPreviewPlatform(result.platform),
    accountNumber: result.accountNumber,
    statementDate: result.statementDate,
    periodStart: result.periodStart,
    periodEnd: result.periodEnd,
    tradeCount: result.tradeCount,
    closedPositionCount: result.closedPositionCount,
    openPositionCount: result.openPositionCount,
    journalEntryCount: result.cashFlowCount,
    netLiquidity: platformData.netLiquidity ?? 0,
    endingCash: platformData.endingCash ?? 0,
    totalFees: result.totalFees,
    grossPnl: result.grossPnl,
    duplicatesSkipped: result.duplicatesSkipped,
    pnlValidation: getPreviewPnlValidation(platformData),
    warnings: result.warnings.map((warning) => `${fileName}: ${warning}`),
  };
}

function getValidationFailuresForPreview(
  fileName: string,
  result: ImportPreviewResult
): ValidationFailure[] {
  const platformData = getPreviewPlatformData(result.platformData);
  const failures = platformData.pnlValidationFailures;

  if (failures && failures.length > 0) {
    return failures.map((failure) => ({
      symbol: `${fileName}: ${failure.symbol}`,
      calculatedPnl: failure.calculatedPnl,
      reportedPnl: failure.reportedPnl,
      discrepancy: failure.discrepancy,
    }));
  }

  const pnlValidation = getPreviewPnlValidation(platformData);
  if (pnlValidation.isValid) {
    return [];
  }

  return [
    {
      symbol: `${fileName}: P&L validation`,
      calculatedPnl: 0,
      reportedPnl: 0,
      discrepancy: pnlValidation.totalDiscrepancy,
    },
  ];
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    showModal: showDemoModal,
    checkDemoTransition,
    confirmTransition,
    cancelTransition,
  } = useDemoTransition();

  const [state, setState] = useState<FlowState>("IDLE");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [phase, setPhase] = useState<ImportPhase>("PARSING");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [previewFileCount, setPreviewFileCount] = useState(1);
  const [filePreviews, setFilePreviews] = useState<FilePreviewData[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [duplicateContext, setDuplicateContext] = useState<DuplicateContext | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationFailures, setValidationFailures] = useState<ValidationFailure[]>([]);
  const [validationTotalDiscrepancy, setValidationTotalDiscrepancy] = useState(0);

  const totalImportFilesRef = useRef(1);
  const currentImportFileIndexRef = useRef(0);
  const currentImportFileNameRef = useRef("");

  const handleImporterProgress = useCallback(
    (nextPhase: ImportPhase, nextProgress: number, nextMessage: string) => {
      setPhase(nextPhase);

      const totalFiles = totalImportFilesRef.current;
      if (totalFiles > 1) {
        const currentIndex = currentImportFileIndexRef.current;
        const totalProgress = Math.round(
          ((currentIndex + nextProgress / 100) / totalFiles) * 100
        );
        setProgress(Math.min(totalProgress, 99));
        setMessage(
          `[${currentIndex + 1}/${totalFiles}] ${currentImportFileNameRef.current}: ${nextMessage}`
        );
        return;
      }

      setProgress(nextProgress);
      setMessage(nextMessage);
    },
    []
  );

  const invalidateImportedData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.statements.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.cashFlows.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.database.hasData }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
    ]);
  }, [queryClient]);

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

      setPhase("PARSING");
      setProgress(Math.round((i / files.length) * 100));
      setMessage(`[${i + 1}/${files.length}] ${file.name}: detecting format...`);

      const importer = await importerRegistry.findImporter(file);
      if (!importer) {
        throw new Error(UNRECOGNIZED_FILE_FORMAT_ERROR);
      }

      setMessage(`[${i + 1}/${files.length}] ${file.name}: parsing...`);

      const previewResult = await importer.parseForPreview(file);
      previews.push(mapToFilePreviewData(file.name, previewResult));

      allValidationFailures.push(...getValidationFailuresForPreview(file.name, previewResult));

      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    const accountNumbers = [...new Set(previews.map((p) => p.accountNumber))];
    const platforms = [...new Set(previews.map((p) => p.platform).filter(Boolean))];
    const statementDates = dateRange(previews.map((p) => p.statementDate));
    const periodStarts = dateRange(previews.map((p) => p.periodStart));
    const periodEnds = dateRange(previews.map((p) => p.periodEnd));

    const aggregatePreview: ImportPreviewData = {
      platform: platforms.length === 1 ? platforms[0] : undefined,
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
      duplicatesSkipped: previews.reduce((sum, p) => sum + (p.duplicatesSkipped ?? 0), 0),
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

        const importer = await importerRegistry.findImporter(file);
        if (!importer) {
          return {
            kind: "error",
            error: UNRECOGNIZED_FILE_FORMAT_ERROR,
            details: [file.name],
            totals,
          };
        }

        const result = await importer.import(file, {
          skipDuplicateCheck: false,
          onProgress: handleImporterProgress,
        });

        if (result.success) {
          await invalidateImportedData();
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
          details: result.warnings,
          totals,
        };
      }

      return { kind: "success", totals };
    },
    [handleImporterProgress, invalidateImportedData]
  );

  const startParsing = useCallback(
    async (files: File[]) => {
      setSelectedFiles(files);
      setState("PARSING");
      setIsReplacing(false);
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
    setPhase("PARSING");
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

    setIsReplacing(true);
    setState("IMPORTING");
    setPhase("PARSING");
    setProgress(0);
    setMessage(`Replacing duplicate import for ${duplicateContext.file.name}...`);

    currentImportFileIndexRef.current = 0;
    currentImportFileNameRef.current = duplicateContext.file.name;
    totalImportFilesRef.current = duplicateContext.remainingFiles.length + 1;

    try {
      const importer = await importerRegistry.findImporter(duplicateContext.file);
      if (!importer) {
        setPhase("FAILED");
        setError(UNRECOGNIZED_FILE_FORMAT_ERROR);
        setErrorDetails([duplicateContext.file.name]);
        setState("ERROR");
        return;
      }

      const replaceResult = await importer.import(duplicateContext.file, {
        skipDuplicateCheck: true,
        onProgress: handleImporterProgress,
      });

      if (!replaceResult.success) {
        setPhase("FAILED");
        setError(replaceResult.error ?? "Failed to replace duplicate import");
        setErrorDetails(replaceResult.warnings);
        setState("ERROR");
        return;
      }

      await invalidateImportedData();

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
    } finally {
      setIsReplacing(false);
    }
  }, [
    duplicateContext,
    finalizeSuccessfulImport,
    handleImporterProgress,
    importFilesSequentially,
    invalidateImportedData,
  ]);

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
    setIsReplacing(false);
    setPhase("PARSING");
    setProgress(0);
    setMessage("");
    setValidationFailures([]);
    setValidationTotalDiscrepancy(0);
    setShowValidationWarning(false);
    totalImportFilesRef.current = 1;
    currentImportFileIndexRef.current = 0;
    currentImportFileNameRef.current = "";
  }, []);

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
          isReplacing={isReplacing}
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
