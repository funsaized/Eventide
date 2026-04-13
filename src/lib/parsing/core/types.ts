/**
 * Core Parsing Abstractions
 *
 * Platform-agnostic interfaces for the import pipeline.
 * Both RobinhoodImporter and KalshiImporter implement SourceImporter.
 */

import type { Platform } from "@/lib/db/types";

/** Shared import progress phases reported by all platform importers */
export type ImportPhase = "PARSING" | "VALIDATING" | "PERSISTING" | "COMPLETE" | "FAILED";

/** Progress callback for UI updates during import */
export type ProgressCallback = (phase: ImportPhase, progress: number, message: string) => void;

/** Options for preview-only parse (no persistence) */
export interface ParseOptions {
  verbose?: boolean;
}

/** Options for full import with persistence */
export interface ImportOptions {
  skipDuplicateCheck?: boolean;
  verbose?: boolean;
  /** Progress callback — enables upload flow to maintain progress UI */
  onProgress?: ProgressCallback;
}

/**
 * Preview result returned by SourceImporter.parseForPreview()
 * Contains all fields needed by the upload preview UI for any platform.
 */
export interface ImportPreviewResult {
  platform: Platform;
  accountNumber: string;
  statementDate: string;
  periodStart: string;
  periodEnd: string;
  tradeCount: number;
  closedPositionCount: number;
  openPositionCount: number;
  cashFlowCount: number;
  totalFees: number;
  grossPnl: number;
  netPnl: number;
  /** Per-trade duplicate count (Kalshi) or 0 (Robinhood) */
  duplicatesSkipped: number;
  warnings: string[];
  /** Platform-specific fields for the preview component (e.g., Robinhood pnlValidation) */
  platformData?: unknown;
}

/**
 * Result returned by SourceImporter.import()
 */
export interface ImportResult {
  success: boolean;
  importId?: string;
  platform: Platform;
  tradesImported: number;
  closedPositionsImported: number;
  openPositionsImported: number;
  cashFlowsImported: number;
  /** Per-trade duplicates skipped (Kalshi per-trade dedup) or 0 (Robinhood statement-level) */
  duplicatesSkipped: number;
  warnings: string[];
  error?: string;
  duplicateImport?: {
    existingId: string;
    existingDate: string;
  };
}

/**
 * Platform importer interface.
 * Each platform (Robinhood, Kalshi, ForecastEx) implements this.
 * Registered with ImporterRegistry at startup.
 */
export interface SourceImporter {
  readonly platform: Platform;
  /** Returns true if this importer can handle the given file */
  canHandle(file: File): Promise<boolean>;
  /** Parse without persisting — for preview UI */
  parseForPreview(file: File, options?: ParseOptions): Promise<ImportPreviewResult>;
  /** Parse and persist to database */
  import(file: File, options?: ImportOptions): Promise<ImportResult>;
}
