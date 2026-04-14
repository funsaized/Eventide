"use client";

/**
 * UploadFlow Component
 *
 * Main orchestration component for the statement upload flow.
 * Handles: upload -> parse -> preview -> import -> redirect
 */

import "@/lib/parsing/register";
import {
  FileUploader,
  ParsingProgress,
  ImportPreview,
  ParseErrorReport,
  DuplicateModal,
  ValidationWarningModal,
} from "@/components/upload";
import { DemoTransitionModal } from "@/features/demo";
import { useUploadFlow } from "@/hooks/use-upload-flow";

export function UploadFlow() {
  const {
    flowState,
    previewData,
    error,
    parseSteps,
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
    handleImport,
    handleReplace,
    handleSkip,
    handleCancel,
    handleReset,
    handleConfirmDemoTransition,
  } = useUploadFlow();

  return (
    <div className="space-y-6">
      {flowState === "IDLE" && (
        <FileUploader onFileSelect={handleFilesSelected} />
      )}

      {flowState === "PARSING" && (
        <ParsingProgress
          phase={phase}
          progress={progress}
          message={message}
          steps={parseSteps}
        />
      )}

      {flowState === "PREVIEW" && previewData && (
        <ImportPreview
          data={previewData}
          fileCount={previewFileCount}
          filePreviews={filePreviews}
          onImport={handleImport}
          onCancel={handleReset}
        />
      )}

      {flowState === "IMPORTING" && (
        <ParsingProgress
          phase={phase}
          progress={progress}
          message={message}
          steps={parseSteps}
        />
      )}

      {flowState === "COMPLETE" && (
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

      {flowState === "ERROR" && error && (
        <ParseErrorReport
          error={error}
          details={errorDetails}
          onRetry={handleReset}
        />
      )}

      {duplicateInfo && (
        <DuplicateModal
          open={flowState === "DUPLICATE"}
          duplicate={duplicateInfo}
          onCancel={handleSkip}
          onReplace={handleReplace}
          isReplacing={isReplacing}
        />
      )}

      <ValidationWarningModal
        open={showValidationWarning}
        failures={validationFailures}
        totalDiscrepancy={validationTotalDiscrepancy}
        onCancel={handleCancel}
        onProceed={handleImport}
      />

      <DemoTransitionModal
        open={showDemoModal}
        onCancel={handleCancel}
        onConfirm={handleConfirmDemoTransition}
      />
    </div>
  );
}
