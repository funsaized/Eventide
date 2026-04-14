"use client";

/**
 * Upload Flow Hook
 *
 * State and async orchestration for the statement upload flow.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import "@/lib/parsing/register";
import { generateDefaultSteps } from "@/components/upload";
import { useToast } from "@/hooks/use-toast";
import { useDemoTransition } from "@/hooks/use-demo-mode";
import { importerRegistry } from "@/lib/parsing/core";
import { queryKeys } from "@/lib/state/query-client";

import type {
  DuplicateInfo,
  FilePreviewData,
  ImportPreviewData,
  ParsingStep,
  ValidationFailure,
} from "@/components/upload";
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

interface PreviewPnlValidation {
  isValid: boolean;
  passCount: number;
  failCount: number;
  totalDiscrepancy: number;
}

interface RobinhoodPreviewPlatformData {
  netLiquidity: number;
  endingCash: number;
  pnlValidation: PreviewPnlValidation;
  pnlValidationFailures: ValidationFailure[];
}

interface ImportQueueState {
  totalFiles: number;
  currentIndex: number;
  currentFileName: string;
}

export interface UseUploadFlowReturn {
  flowState: FlowState;
  previewData: ImportPreviewData | null;
  error: string | null;
  parseSteps: ParsingStep[];
  importTotals: ImportTotals;
  duplicateInfo: DuplicateInfo | null;
  validationFailures: ValidationFailure[];
  showDemoModal: boolean;
  previewFileCount: number;
  filePreviews: FilePreviewData[];
  errorDetails: string[];
  isReplacing: boolean;
  phase: ImportPhase;
  progress: number;
  message: string;
  showValidationWarning: boolean;
  validationTotalDiscrepancy: number;
  handleFilesSelected: (files: File[]) => void;
  handleImport: () => void;
  handleReplace: () => void;
  handleSkip: () => void;
  handleCancel: () => void;
  handleReset: () => void;
  handleConfirmDemoTransition: () => void;
  setShowDemoModal: (show: boolean) => void;
}

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

function getRobinhoodPlatformData(
  result: ImportPreviewResult
): RobinhoodPreviewPlatformData | null {
  if (result.platform !== "robinhood" || !result.platformData) {
    return null;
  }

  const platformData = result.platformData;
  if (typeof platformData !== "object") {
    return null;
  }

  const netLiquidity = "netLiquidity" in platformData ? platformData.netLiquidity : undefined;
  const endingCash = "endingCash" in platformData ? platformData.endingCash : undefined;
  const pnlValidation = "pnlValidation" in platformData ? platformData.pnlValidation : undefined;
  const pnlValidationFailures =
    "pnlValidationFailures" in platformData ? platformData.pnlValidationFailures : undefined;

  if (
    typeof netLiquidity !== "number" ||
    typeof endingCash !== "number" ||
    !pnlValidation ||
    typeof pnlValidation !== "object" ||
    !Array.isArray(pnlValidationFailures)
  ) {
    return null;
  }

  return {
    netLiquidity,
    endingCash,
    pnlValidation: {
      isValid:
        "isValid" in pnlValidation && typeof pnlValidation.isValid === "boolean"
          ? pnlValidation.isValid
          : true,
      passCount:
        "passCount" in pnlValidation && typeof pnlValidation.passCount === "number"
          ? pnlValidation.passCount
          : 0,
      failCount:
        "failCount" in pnlValidation && typeof pnlValidation.failCount === "number"
          ? pnlValidation.failCount
          : 0,
      totalDiscrepancy:
        "totalDiscrepancy" in pnlValidation &&
        typeof pnlValidation.totalDiscrepancy === "number"
          ? pnlValidation.totalDiscrepancy
          : 0,
    },
    pnlValidationFailures: pnlValidationFailures.filter(
      (failure): failure is ValidationFailure => {
        if (!failure || typeof failure !== "object") {
          return false;
        }

        return (
          "symbol" in failure &&
          typeof failure.symbol === "string" &&
          "calculatedPnl" in failure &&
          typeof failure.calculatedPnl === "number" &&
          "reportedPnl" in failure &&
          typeof failure.reportedPnl === "number" &&
          "discrepancy" in failure &&
          typeof failure.discrepancy === "number"
        );
      }
    ),
  };
}

function getPreviewPnlValidation(
  rhData: RobinhoodPreviewPlatformData | null
): PreviewPnlValidation {
  return (
    rhData?.pnlValidation ?? {
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
  const rhData = getRobinhoodPlatformData(result);

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
    netLiquidity: rhData?.netLiquidity ?? 0,
    endingCash: rhData?.endingCash ?? 0,
    totalFees: result.totalFees,
    grossPnl: result.grossPnl,
    duplicatesSkipped: result.duplicatesSkipped,
    pnlValidation: getPreviewPnlValidation(rhData),
    warnings: result.warnings.map((warning) => `${fileName}: ${warning}`),
  };
}

function getValidationFailuresForPreview(
  fileName: string,
  result: ImportPreviewResult
): ValidationFailure[] {
  const rhData = getRobinhoodPlatformData(result);
  const failures = rhData?.pnlValidationFailures;

  if (failures && failures.length > 0) {
    return failures.map((failure) => ({
      symbol: `${fileName}: ${failure.symbol}`,
      calculatedPnl: failure.calculatedPnl,
      reportedPnl: failure.reportedPnl,
      discrepancy: failure.discrepancy,
    }));
  }

  const pnlValidation = getPreviewPnlValidation(rhData);
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

export function useUploadFlow(): UseUploadFlowReturn {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    showModal: showDemoModal,
    checkDemoTransition,
    confirmTransition,
    cancelTransition,
  } = useDemoTransition();

  const [flowState, setFlowState] = useState<FlowState>("IDLE");
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
  const [importTotals, setImportTotals] = useState<ImportTotals>(createEmptyTotals);

  const importQueueRef = useRef<ImportQueueState>({
    totalFiles: 1,
    currentIndex: 0,
    currentFileName: "",
  });

  const handleImporterProgress = useCallback(
    (nextPhase: ImportPhase, nextProgress: number, nextMessage: string) => {
      setPhase(nextPhase);

      const { totalFiles, currentIndex, currentFileName } = importQueueRef.current;
      if (totalFiles > 1) {
        const totalProgress = Math.round(
          ((currentIndex + nextProgress / 100) / totalFiles) * 100
        );
        setProgress(Math.min(totalProgress, 99));
        setMessage(`[${currentIndex + 1}/${totalFiles}] ${currentFileName}: ${nextMessage}`);
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
      setImportTotals(totals);
      setPhase("COMPLETE");
      setProgress(100);
      setMessage("Import complete");
      setFlowState("COMPLETE");

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

    const accountNumbers = [...new Set(previews.map((preview) => preview.accountNumber))];
    const platforms = [...new Set(previews.map((preview) => preview.platform).filter(Boolean))];
    const statementDates = dateRange(previews.map((preview) => preview.statementDate));
    const periodStarts = dateRange(previews.map((preview) => preview.periodStart));
    const periodEnds = dateRange(previews.map((preview) => preview.periodEnd));

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
      tradeCount: previews.reduce((sum, preview) => sum + preview.tradeCount, 0),
      closedPositionCount: previews.reduce(
        (sum, preview) => sum + preview.closedPositionCount,
        0
      ),
      openPositionCount: previews.reduce((sum, preview) => sum + preview.openPositionCount, 0),
      journalEntryCount: previews.reduce((sum, preview) => sum + preview.journalEntryCount, 0),
      netLiquidity: previews.reduce((sum, preview) => sum + preview.netLiquidity, 0),
      endingCash: previews.reduce((sum, preview) => sum + preview.endingCash, 0),
      totalFees: previews.reduce((sum, preview) => sum + preview.totalFees, 0),
      grossPnl: previews.reduce((sum, preview) => sum + preview.grossPnl, 0),
      duplicatesSkipped: previews.reduce(
        (sum, preview) => sum + (preview.duplicatesSkipped ?? 0),
        0
      ),
      pnlValidation: {
        isValid: previews.every((preview) => preview.pnlValidation.isValid),
        passCount: previews.reduce((sum, preview) => sum + preview.pnlValidation.passCount, 0),
        failCount: previews.reduce((sum, preview) => sum + preview.pnlValidation.failCount, 0),
        totalDiscrepancy: previews.reduce(
          (sum, preview) => sum + preview.pnlValidation.totalDiscrepancy,
          0
        ),
      },
      warnings: previews.flatMap((preview) => preview.warnings),
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
        importQueueRef.current.currentIndex = indexOffset + i;
        importQueueRef.current.currentFileName = file.name;
        importQueueRef.current.totalFiles = totalCount;

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
          setImportTotals(totals);
          continue;
        }

        if (result.duplicateImport) {
          setImportTotals(totals);
          return {
            kind: "duplicate",
            file,
            duplicate: result.duplicateImport,
            remainingFiles: files.slice(i + 1),
            totals,
          };
        }

        setImportTotals(totals);
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
      setFlowState("PARSING");
      setIsReplacing(false);
      setError(null);
      setErrorDetails([]);
      setDuplicateInfo(null);
      setDuplicateContext(null);
      setImportTotals(createEmptyTotals());

      try {
        await parseFilesForPreview(files);
        setPhase("COMPLETE");
        setProgress(100);
        setMessage(`Parsed ${files.length} file${files.length !== 1 ? "s" : ""}`);
        setFlowState("PREVIEW");
      } catch (err) {
        console.error("Parse error:", err);
        setPhase("FAILED");
        setError(err instanceof Error ? err.message : "Unknown error");
        setFlowState("ERROR");
      }
    },
    [parseFilesForPreview]
  );

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      checkDemoTransition(files, startParsing);
    },
    [checkDemoTransition, startParsing]
  );

  const handleImport = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setFlowState("IMPORTING");
    setPhase("PARSING");
    setProgress(0);
    setMessage("Starting import...");
    setImportTotals(createEmptyTotals());

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
      setFlowState("DUPLICATE");
      return;
    }

    setPhase("FAILED");
    setError(outcome.error);
    setErrorDetails(outcome.details);
    setImportTotals(outcome.totals);
    setFlowState("ERROR");
  }, [selectedFiles, importFilesSequentially, finalizeSuccessfulImport]);

  const handleReplace = useCallback(async () => {
    if (!duplicateContext) return;

    setIsReplacing(true);
    setFlowState("IMPORTING");
    setPhase("PARSING");
    setProgress(0);
    setMessage(`Replacing duplicate import for ${duplicateContext.file.name}...`);

    importQueueRef.current.currentIndex = 0;
    importQueueRef.current.currentFileName = duplicateContext.file.name;
    importQueueRef.current.totalFiles = duplicateContext.remainingFiles.length + 1;

    try {
      const importer = await importerRegistry.findImporter(duplicateContext.file);
      if (!importer) {
        setPhase("FAILED");
        setError(UNRECOGNIZED_FILE_FORMAT_ERROR);
        setErrorDetails([duplicateContext.file.name]);
        setFlowState("ERROR");
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
        setFlowState("ERROR");
        return;
      }

      await invalidateImportedData();

      const baseTotals = addImportResult(duplicateContext.totals, replaceResult);
      baseTotals.filesReplaced += 1;
      setImportTotals(baseTotals);

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
        setFlowState("DUPLICATE");
        return;
      }

      setPhase("FAILED");
      setError(outcome.error);
      setErrorDetails(outcome.details);
      setImportTotals(outcome.totals);
      setFlowState("ERROR");
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
    setFlowState("IDLE");
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
    setImportTotals(createEmptyTotals());
    importQueueRef.current = {
      totalFiles: 1,
      currentIndex: 0,
      currentFileName: "",
    };
  }, []);

  const handleSkip = useCallback(() => {
    handleReset();
  }, [handleReset]);

  const handleCancel = useCallback(() => {
    if (showDemoModal) {
      cancelTransition();
      return;
    }

    if (showValidationWarning) {
      setShowValidationWarning(false);
      return;
    }

    handleReset();
  }, [cancelTransition, handleReset, showDemoModal, showValidationWarning]);

  const handleConfirmDemoTransition = useCallback(() => {
    void confirmTransition(startParsing);
  }, [confirmTransition, startParsing]);

  const parseSteps = useMemo(() => generateDefaultSteps(phase), [phase]);

  const setShowDemoModal = useCallback(
    (show: boolean) => {
      if (!show) {
        cancelTransition();
      }
    },
    [cancelTransition]
  );

  return {
    flowState,
    previewData,
    error,
    parseSteps,
    importTotals,
    duplicateInfo,
    validationFailures,
    showDemoModal,
    previewFileCount,
    filePreviews,
    errorDetails,
    isReplacing,
    phase,
    progress,
    message,
    showValidationWarning,
    validationTotalDiscrepancy,
    handleFilesSelected,
    handleImport: () => {
      void handleImport();
    },
    handleReplace: () => {
      void handleReplace();
    },
    handleSkip,
    handleCancel,
    handleReset,
    handleConfirmDemoTransition,
    setShowDemoModal,
  };
}
