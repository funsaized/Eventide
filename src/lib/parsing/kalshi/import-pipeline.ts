/**
 * Kalshi Import Pipeline
 *
 * Orchestrates Kalshi CSV imports: parse, deduplicate, and persist.
 */

import { query, transaction } from "@/lib/db/client";
import { createCashFlows, createClosedPositions } from "@/lib/db/queries/positions";
import { createStatementImport, generateId } from "@/lib/db/queries/statements";
import { createTrades } from "@/lib/db/queries/trades";
import type {
  CreateTradeInput,
  StatementImport,
} from "@/lib/db/types";
import type { ImportOptions, ImportPreviewResult, ImportResult } from "@/lib/parsing/core";

import { parseKalshiActivityCsv, parseKalshiTransactionsCsv } from "./csv-parser";
import { activityToCashFlows, transformAllTransactions } from "./transform";
import type { KalshiActivityRow, KalshiTransactionRow } from "./types";
import { centsToDecimal, parseIsoTimestamp } from "./utils";

const KALSHI_ACCOUNT_ID = "kalshi-default";

// ============================================================================
// DEDUPLICATION
// ============================================================================

function buildTradeDedupKey(symbol: string, openTimestamp: string, closeTimestamp: string): string {
  return `kalshi|${symbol}|${openTimestamp}|${closeTimestamp}`;
}

function getTradeDedupKey(trade: CreateTradeInput): string | null {
  const metadata = trade.platform_metadata;
  if (!metadata) {
    return null;
  }

  const openTimestamp = metadata.open_timestamp;
  const closeTimestamp = metadata.close_timestamp;
  if (typeof openTimestamp !== "string" || typeof closeTimestamp !== "string") {
    return null;
  }

  return buildTradeDedupKey(trade.symbol, openTimestamp, closeTimestamp);
}

/**
 * Check which Kalshi position trade pairs already exist in the database.
 * Deduplication is keyed by platform + symbol + open/close timestamps.
 */
export async function checkKalshiTradeDuplicates(
  trades: CreateTradeInput[]
): Promise<{ unique: CreateTradeInput[]; duplicateCount: number }> {
  const incomingOpenKeys = new Set<string>();

  for (const trade of trades) {
    if (trade.trade_type !== "OPEN") {
      continue;
    }

    const key = getTradeDedupKey(trade);
    if (key) {
      incomingOpenKeys.add(key);
    }
  }

  if (incomingOpenKeys.size === 0) {
    return { unique: trades, duplicateCount: 0 };
  }

  const existingTrades = await query<{ symbol: string; platform_metadata: string | null }>(
    `SELECT symbol, platform_metadata
     FROM trades
     WHERE platform = ? AND trade_type = 'OPEN'`,
    ["kalshi"]
  );

  const existingKeys = new Set<string>();
  for (const trade of existingTrades) {
    if (!trade.platform_metadata) {
      continue;
    }

    try {
      const metadata = JSON.parse(trade.platform_metadata) as Record<string, unknown>;
      const openTimestamp = metadata.open_timestamp;
      const closeTimestamp = metadata.close_timestamp;

      if (typeof openTimestamp === "string" && typeof closeTimestamp === "string") {
        existingKeys.add(buildTradeDedupKey(trade.symbol, openTimestamp, closeTimestamp));
      }
    } catch {
      // Ignore malformed metadata on existing rows.
    }
  }

  const duplicateKeys = new Set<string>();
  for (const key of incomingOpenKeys) {
    if (existingKeys.has(key)) {
      duplicateKeys.add(key);
    }
  }

  if (duplicateKeys.size === 0) {
    return { unique: trades, duplicateCount: 0 };
  }

  const unique = trades.filter((trade) => {
    const key = getTradeDedupKey(trade);
    return key === null || !duplicateKeys.has(key);
  });

  return {
    unique,
    duplicateCount: duplicateKeys.size,
  };
}

// ============================================================================
// DATE DERIVATION
// ============================================================================

function deriveImportDates(rows: KalshiTransactionRow[]): {
  statementDate: string;
  periodStart: string;
  periodEnd: string;
} {
  if (rows.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      statementDate: today,
      periodStart: today,
      periodEnd: today,
    };
  }

  const openDates = rows.map((row) => parseIsoTimestamp(row.open_timestamp)).sort();
  const closeDates = rows.map((row) => parseIsoTimestamp(row.close_timestamp)).sort();

  return {
    statementDate: closeDates[closeDates.length - 1],
    periodStart: openDates[0],
    periodEnd: closeDates[closeDates.length - 1],
  };
}

function deriveActivityDates(rows: KalshiActivityRow[]): {
  statementDate: string;
  periodStart: string;
  periodEnd: string;
} {
  if (rows.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      statementDate: today,
      periodStart: today,
      periodEnd: today,
    };
  }

  const dates = rows.map((row) => parseIsoTimestamp(row.Original_Date)).sort();

  return {
    statementDate: dates[dates.length - 1],
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
  };
}

// ============================================================================
// PREVIEW
// ============================================================================

export async function parseKalshiTransactionsForPreview(
  csvContent: string
): Promise<ImportPreviewResult> {
  const parsed = parseKalshiTransactionsCsv(csvContent);
  const { trades, closedPositions } = transformAllTransactions(
    parsed.rows,
    "preview",
    KALSHI_ACCOUNT_ID
  );
  const { duplicateCount } = await checkKalshiTradeDuplicates(trades);
  const dates = deriveImportDates(parsed.rows);

  const totalFees = centsToDecimal(
    parsed.rows.reduce((sum, row) => sum + row.open_fees_cents + row.close_fees_cents, 0)
  );
  const grossPnl = centsToDecimal(
    parsed.rows.reduce((sum, row) => sum + row.realized_pnl_without_fees_cents, 0)
  );
  const netPnl = centsToDecimal(
    parsed.rows.reduce((sum, row) => sum + row.realized_pnl_with_fees_cents, 0)
  );

  return {
    platform: "kalshi",
    accountNumber: KALSHI_ACCOUNT_ID,
    statementDate: dates.statementDate,
    periodStart: dates.periodStart,
    periodEnd: dates.periodEnd,
    tradeCount: trades.length,
    closedPositionCount: closedPositions.length,
    openPositionCount: 0,
    cashFlowCount: 0,
    totalFees,
    grossPnl,
    netPnl,
    duplicatesSkipped: duplicateCount,
    warnings: parsed.warnings,
  };
}

export async function parseKalshiActivityForPreview(
  csvContent: string
): Promise<ImportPreviewResult> {
  const parsed = parseKalshiActivityCsv(csvContent);
  const rows = [...parsed.deposits, ...parsed.credits];
  const dates = deriveActivityDates(rows);

  const totalDeposits = parsed.deposits.reduce(
    (sum, deposit) => sum + (Number.parseFloat(deposit.Amount_In_Dollars) || 0),
    0
  );

  return {
    platform: "kalshi",
    accountNumber: KALSHI_ACCOUNT_ID,
    statementDate: dates.statementDate,
    periodStart: dates.periodStart,
    periodEnd: dates.periodEnd,
    tradeCount: 0,
    closedPositionCount: 0,
    openPositionCount: 0,
    cashFlowCount: activityToCashFlows(parsed, "preview").length,
    totalFees: 0,
    grossPnl: 0,
    netPnl: 0,
    duplicatesSkipped: 0,
    warnings: parsed.warnings,
    platformData: {
      totalDeposits,
    },
  };
}

// ============================================================================
// IMPORT
// ============================================================================

export async function importKalshiTransactions(
  csvContent: string,
  options?: ImportOptions
): Promise<ImportResult> {
  const onProgress = options?.onProgress;

  try {
    onProgress?.("PARSING", 10, "Parsing Kalshi Transactions CSV...");
    const parsed = parseKalshiTransactionsCsv(csvContent);

    if (parsed.rows.length === 0) {
      return {
        success: true,
        platform: "kalshi",
        tradesImported: 0,
        closedPositionsImported: 0,
        openPositionsImported: 0,
        cashFlowsImported: 0,
        duplicatesSkipped: 0,
        warnings: parsed.warnings,
      };
    }

    onProgress?.("VALIDATING", 35, "Transforming Kalshi transactions...");
    const { trades, closedPositions } = transformAllTransactions(
      parsed.rows,
      "pending",
      KALSHI_ACCOUNT_ID
    );

    let uniqueTrades = trades;
    let duplicateCount = 0;

    if (!options?.skipDuplicateCheck) {
      onProgress?.("VALIDATING", 55, "Checking for duplicate Kalshi trades...");
      const dedupResult = await checkKalshiTradeDuplicates(trades);
      uniqueTrades = dedupResult.unique;
      duplicateCount = dedupResult.duplicateCount;
    }

    if (uniqueTrades.length === 0) {
      return {
        success: true,
        platform: "kalshi",
        tradesImported: 0,
        closedPositionsImported: 0,
        openPositionsImported: 0,
        cashFlowsImported: 0,
        duplicatesSkipped: duplicateCount,
        warnings:
          duplicateCount > 0
            ? [...parsed.warnings, `All ${duplicateCount} Kalshi positions were already imported`]
            : parsed.warnings,
      };
    }

    // Each parsed row produces: trades[2*i] = OPEN, trades[2*i+1] = CLOSE, closedPositions[i].
    // Match closed positions to their OPEN trade by index — use the TRADE's dedup key
    // (which has raw ISO timestamps) instead of the position's entry_date/exit_date (YYYY-MM-DD).
    const uniqueTradeKeys = new Set(
      uniqueTrades
        .filter((trade) => trade.trade_type === "OPEN")
        .map((trade) => getTradeDedupKey(trade))
        .filter((key): key is string => key !== null)
    );

    const uniqueClosedPositions = closedPositions.filter((_, i) => {
      const openTrade = trades[2 * i]; // Original OPEN trade (before dedup filtering)
      if (!openTrade) return false;
      const key = getTradeDedupKey(openTrade);
      return key === null || uniqueTradeKeys.has(key);
    });

    const dates = deriveImportDates(parsed.rows);

    onProgress?.("PERSISTING", 80, "Saving Kalshi transactions to database...");
    const importId = await transaction(async () => {
      const id = generateId();

      const importTotalFees = uniqueClosedPositions.reduce(
        (sum, pos) => sum + (pos.fees ?? 0), 0
      );

      await createStatementImport({
        id,
        platform: "kalshi",
        account_number: KALSHI_ACCOUNT_ID,
        statement_date: dates.statementDate,
        statement_period_start: dates.periodStart,
        statement_period_end: dates.periodEnd,
        parser_version: "kalshi-csv-v1",
        total_fees: importTotalFees !== 0 ? -Math.abs(importTotalFees) : undefined,
      });

      const tradesWithImportId = uniqueTrades.map((trade) => ({
        ...trade,
        import_id: id,
      }));

      const closedPositionsWithImportId = uniqueClosedPositions.map((position) => ({
        ...position,
        import_id: id,
      }));

      if (tradesWithImportId.length > 0) {
        await createTrades(tradesWithImportId);
      }

      if (closedPositionsWithImportId.length > 0) {
        await createClosedPositions(closedPositionsWithImportId);
      }

      return id;
    });

    onProgress?.("COMPLETE", 100, "Kalshi transaction import complete");

    return {
      success: true,
      importId,
      platform: "kalshi",
      tradesImported: uniqueTrades.length,
      closedPositionsImported: uniqueClosedPositions.length,
      openPositionsImported: 0,
      cashFlowsImported: 0,
      duplicatesSkipped: duplicateCount,
      warnings: parsed.warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onProgress?.("FAILED", 0, `Import failed: ${message}`);

    return {
      success: false,
      platform: "kalshi",
      tradesImported: 0,
      closedPositionsImported: 0,
      openPositionsImported: 0,
      cashFlowsImported: 0,
      duplicatesSkipped: 0,
      warnings: [],
      error: message,
    };
  }
}

export async function importKalshiActivity(
  csvContent: string,
  importId: string,
  options?: ImportOptions
): Promise<ImportResult> {
  const onProgress = options?.onProgress;

  try {
    onProgress?.("PARSING", 20, "Parsing Kalshi Activity CSV...");
    const parsed = parseKalshiActivityCsv(csvContent);
    const cashFlows = activityToCashFlows(parsed, importId);

    onProgress?.("PERSISTING", 80, "Saving Kalshi activity cash flows...");
    if (cashFlows.length > 0) {
      await createCashFlows(cashFlows);
    }

    onProgress?.("COMPLETE", 100, "Kalshi activity import complete");

    return {
      success: true,
      importId,
      platform: "kalshi",
      tradesImported: 0,
      closedPositionsImported: 0,
      openPositionsImported: 0,
      cashFlowsImported: cashFlows.length,
      duplicatesSkipped: 0,
      warnings: parsed.warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onProgress?.("FAILED", 0, `Activity import failed: ${message}`);

    return {
      success: false,
      platform: "kalshi",
      tradesImported: 0,
      closedPositionsImported: 0,
      openPositionsImported: 0,
      cashFlowsImported: 0,
      duplicatesSkipped: 0,
      warnings: [],
      error: message,
    };
  }
}

export async function getLatestKalshiTransactionsImport(): Promise<StatementImport | null> {
  const results = await query<StatementImport>(
    `SELECT si.*
     FROM statement_imports si
     WHERE si.platform = ?
       AND EXISTS (
         SELECT 1
         FROM trades t
         WHERE t.import_id = si.id
           AND t.platform = ?
       )
     ORDER BY si.import_timestamp DESC
     LIMIT 1`,
    ["kalshi", "kalshi"]
  );

  return results[0] ?? null;
}
