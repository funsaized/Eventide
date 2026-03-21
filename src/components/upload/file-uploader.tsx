"use client";

/**
 * FileUploader Component
 *
 * Drag-and-drop file upload with validation for PDF files.
 */

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
  /** Whether upload is disabled */
  disabled?: boolean;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Accepted file types */
  accept?: string;
  /** Custom class name */
  className?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function FileUploader({
  onFileSelect,
  disabled = false,
  maxSizeMB = 10,
  accept = ".pdf",
  className,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): ValidationResult => {
      // Check file type
      if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
        return { valid: false, error: "Please select a PDF file" };
      }

      // Check file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        return {
          valid: false,
          error: `File size (${sizeMB.toFixed(1)}MB) exceeds limit of ${maxSizeMB}MB`,
        };
      }

      return { valid: true };
    },
    [maxSizeMB]
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      setError(null);

      if (files.length === 0) {
        return;
      }

      const invalidFile = files.find((file) => !validateFile(file).valid);
      if (invalidFile) {
        const validation = validateFile(invalidFile);
        setError(validation.error ?? "Invalid file");
        return;
      }

      onFileSelect(files);
    },
    [validateFile, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      handleFiles(files);
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFiles]
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer",
            isDragging && "border-primary bg-primary/5",
            !isDragging && "border-muted-foreground/25 hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed",
            error && "border-destructive"
          )}
        >
          <input
            type="file"
            multiple
            accept={accept}
            onChange={handleInputChange}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
            <div className="p-4 rounded-full bg-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
            </div>

            <div>
              <p className="text-lg font-medium">
                {isDragging ? "Drop your statements here" : "Upload your statements"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Drag and drop Robinhood Derivatives PDFs or click to browse
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              PDF files only, up to {maxSizeMB}MB
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive font-medium">{error}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
