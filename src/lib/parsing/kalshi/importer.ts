/**
 * Kalshi Platform Importer
 *
 * Implements the shared SourceImporter interface for Kalshi CSV exports.
 */

import type { Platform } from "@/lib/db/types";
import {
  importerRegistry,
  type ImportOptions,
  type ImportPreviewResult,
  type ImportResult,
  type ParseOptions,
  type SourceImporter,
} from "@/lib/parsing/core";

import {
  getLatestKalshiTransactionsImport,
  importKalshiActivity,
  importKalshiTransactions,
  parseKalshiActivityForPreview,
  parseKalshiTransactionsForPreview,
} from "./import-pipeline";
import type { KalshiCsvType } from "./types";
import { stripBom } from "./utils";

const TRANSACTIONS_HEADER_START = "type,quantity,market_ticker";
const ACTIVITY_HEADER_MARKERS = ["Market_Ticker", "Deposit_Type"] as const;

function detectKalshiCsvType(csvContent: string): KalshiCsvType {
  const firstLine = stripBom(csvContent).split(/\r?\n/)[0] ?? "";
  const normalized = firstLine.replace(/"/g, "").trim();

  if (normalized.startsWith(TRANSACTIONS_HEADER_START)) {
    return "transactions";
  }

  if (ACTIVITY_HEADER_MARKERS.every((marker) => normalized.includes(marker))) {
    return "activity";
  }

  return "unknown";
}

export class KalshiImporter implements SourceImporter {
  readonly platform: Platform = "kalshi";

  async canHandle(file: File): Promise<boolean> {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return false;
    }

    const content = await file.text();
    return detectKalshiCsvType(content) !== "unknown";
  }

  async parseForPreview(file: File, _options?: ParseOptions): Promise<ImportPreviewResult> {
    const content = await file.text();
    const csvType = detectKalshiCsvType(content);

    if (csvType === "transactions") {
      return parseKalshiTransactionsForPreview(content);
    }

    if (csvType === "activity") {
      return parseKalshiActivityForPreview(content);
    }

    throw new Error("Unrecognized Kalshi CSV format");
  }

  async import(file: File, options?: ImportOptions): Promise<ImportResult> {
    const content = await file.text();
    const csvType = detectKalshiCsvType(content);

    if (csvType === "transactions") {
      return importKalshiTransactions(content, options);
    }

    if (csvType === "activity") {
      const existingImport = await getLatestKalshiTransactionsImport();
      if (!existingImport) {
        return {
          success: false,
          platform: "kalshi",
          tradesImported: 0,
          closedPositionsImported: 0,
          openPositionsImported: 0,
          cashFlowsImported: 0,
          duplicatesSkipped: 0,
          warnings: [],
          error: "Import a Kalshi Transactions CSV before importing Kalshi Activity CSV",
        };
      }

      return importKalshiActivity(content, existingImport.id, options);
    }

    return {
      success: false,
      platform: "kalshi",
      tradesImported: 0,
      closedPositionsImported: 0,
      openPositionsImported: 0,
      cashFlowsImported: 0,
      duplicatesSkipped: 0,
      warnings: [],
      error: "Unrecognized Kalshi CSV format",
    };
  }
}

importerRegistry.register(new KalshiImporter());
