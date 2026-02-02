/**
 * Statement Import Pipeline
 *
 * Complete pipeline for importing Robinhood Derivatives statements:
 * 1. Extract text from PDF
 * 2. Detect section boundaries
 * 3. Parse all sections (2, 3, 4, 5, 6, 7, 10)
 * 4. Merge trades with deduplication
 * 5. Attribute fees from Section 3
 * 6. Build position ledger and calculate P&L using FIFO
 * 7. Validate against Section 5 (source of truth)
 * 8. Transform to database DTOs
 * 9. Persist in a transaction with duplicate detection
 */

import type { ExtractedDocument } from "./types";
import type { SectionBoundary } from "./sections/boundaries";
import type { TradeConfirmation, Section2ParseResult } from "./sections/section2";
import type { TradeConfirmationSummary, Section3ParseResult } from "./sections/section3";
import type { PurchaseSaleTrade, Section4ParseResult } from "./sections/section4";
import type { PairedPosition, Section5ParseResult } from "./sections/section5";
import type { JournalEntryRow, Section6ParseResult } from "./sections/section6";
import type { OpenPosition, Section7ParseResult } from "./sections/section7";
import type { AccountSummaryRaw, Section10ParseResult } from "./sections/section10";
import type { TradeEntry, FifoResult } from "../calculations/fifo";
import type { TradeWithFees, FeeAttributionResult } from "../calculations/fee-attribution";
import type { ValidationResult as PnlValidationResult } from "../calculations/validation";
import type {
  Platform,
  CreateStatementImportInput,
  CreateTradeInput,
  CreateClosedPositionInput,
  CreateCashFlowInput,
  CreateOpenPositionInput,
} from "../db/types";

import { loadPDFFromFile, flattenDocument } from "./pdf-loader";
import {
  detectSectionBoundaries,
  getSection,
  validateRequiredSections,
} from "./sections/boundaries";
import { parseSection2 } from "./sections/section2";
import { parseSection3 } from "./sections/section3";
import { parseSection4, mergeTradesWithDeduplication } from "./sections/section4";
import { parseSection5 } from "./sections/section5";
import { parseSection6, toJournalEntry } from "./sections/section6";
import { parseSection7, toOpenPositionRow } from "./sections/section7";
import { parseSection10, toAccountSummary, extractStatementMetadata } from "./sections/section10";
import { calculateAllPositions, getTotalPnl } from "../calculations/fifo";
import { attributeFees } from "../calculations/fee-attribution";
import {
  validatePnlAgainstSection5,
  shouldBlockImport,
  createReconciliationRecord,
} from "../calculations/validation";
import { categorizeSymbol } from "./symbol";
import { extractAccountNumber, extractStatementDate, extractStatementPeriod } from "./utils";

import { transaction } from "../db/client";
import { checkDuplicateImport, createStatementImport } from "../db/queries/statements";
import { createTrades } from "../db/queries/trades";
import { createClosedPositions, createCashFlows, createOpenPositions } from "../db/queries/positions";
import { generateId } from "../db/queries/statements";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Import pipeline options
 */
export interface ImportOptions {
  /** Enable strict mode - block on any P&L discrepancy */
  strictMode?: boolean;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Skip duplicate check (for replacing imports) */
  skipDuplicateCheck?: boolean;
  /** PDF password if encrypted */
  password?: string;
}

/**
 * Parse result before persistence
 */
export interface ParsedImportData {
  /** Account metadata */
  accountNumber: string;
  statementDate: string;
  periodStart: string;
  periodEnd: string;
  /** Account summary from Section 10 */
  accountSummary: AccountSummaryRaw;
  /** Merged trades from Section 2 + 4 with fees */
  tradesWithFees: TradeWithFees[];
  /** Paired positions from Section 5 */
  pairedPositions: PairedPosition[];
  /** Journal entries from Section 6 */
  journalEntries: JournalEntryRow[];
  /** Open positions from Section 7 */
  openPositions: OpenPosition[];
  /** Fee summary from Section 3 */
  feeSummaries: TradeConfirmationSummary[];
  /** FIFO calculation results */
  fifoResults: Map<string, FifoResult>;
  /** P&L validation result */
  pnlValidation: PnlValidationResult;
  /** Fee attribution result */
  feeAttribution: FeeAttributionResult;
  /** Parsing warnings */
  warnings: string[];
}

/**
 * Import result
 */
export interface ImportResult {
  /** Success status */
  success: boolean;
  /** Import ID if successful */
  importId?: string;
  /** Number of trades imported */
  tradesImported: number;
  /** Number of closed positions imported */
  closedPositionsImported: number;
  /** Number of open positions imported */
  openPositionsImported: number;
  /** Number of cash flows imported */
  cashFlowsImported: number;
  /** Net liquidity from statement */
  netLiquidity: number;
  /** Total fees */
  totalFees: number;
  /** P&L validation warnings */
  validationWarnings: string[];
  /** Parsing warnings */
  parsingWarnings: string[];
  /** Error message if failed */
  error?: string;
  /** Duplicate import if detected */
  duplicateImport?: {
    existingId: string;
    existingDate: string;
  };
}

/**
 * Import phase for progress tracking
 */
export type ImportPhase =
  | "EXTRACTING"
  | "DETECTING_SECTIONS"
  | "PARSING_SECTIONS"
  | "CALCULATING_PNL"
  | "VALIDATING"
  | "PERSISTING"
  | "COMPLETE"
  | "FAILED";

/**
 * Progress callback
 */
export type ProgressCallback = (phase: ImportPhase, progress: number, message: string) => void;

// ============================================================================
// MAIN PIPELINE
// ============================================================================

/**
 * Import a statement PDF file
 *
 * This is the main entry point for importing statements.
 *
 * @param file PDF file to import
 * @param options Import options
 * @param onProgress Progress callback
 */
export async function importStatement(
  file: File,
  options: ImportOptions = {},
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  const { strictMode = false, verbose = false, skipDuplicateCheck = false } = options;
  const warnings: string[] = [];

  try {
    // Phase 1: Extract PDF
    onProgress?.("EXTRACTING", 0, "Extracting text from PDF...");

    const document = await loadPDFFromFile(file, {
      password: options.password,
      verbose,
    });

    if (verbose) {
      console.log(`[Import] Extracted ${document.pageCount} pages`);
    }

    // Phase 2: Parse and validate
    onProgress?.("DETECTING_SECTIONS", 20, "Detecting sections...");

    const parsedData = await parseDocument(document, verbose);
    warnings.push(...parsedData.warnings);

    // Phase 3: Check for duplicates
    if (!skipDuplicateCheck) {
      const existing = await checkDuplicateImport(
        "robinhood",
        parsedData.accountNumber,
        parsedData.statementDate
      );

      if (existing) {
        return {
          success: false,
          tradesImported: 0,
          closedPositionsImported: 0,
          openPositionsImported: 0,
          cashFlowsImported: 0,
          netLiquidity: 0,
          totalFees: 0,
          validationWarnings: [],
          parsingWarnings: warnings,
          error: "Duplicate statement detected",
          duplicateImport: {
            existingId: existing.id,
            existingDate: existing.statement_date,
          },
        };
      }
    }

    // Phase 4: Check if import should be blocked
    onProgress?.("VALIDATING", 60, "Validating P&L calculations...");

    const blockDecision = shouldBlockImport(parsedData.pnlValidation, strictMode);
    if (blockDecision.block) {
      return {
        success: false,
        tradesImported: 0,
        closedPositionsImported: 0,
        openPositionsImported: 0,
        cashFlowsImported: 0,
        netLiquidity: parsedData.accountSummary.netLiquidity ?? 0,
        totalFees: parsedData.accountSummary.totalCommissionsAndFees ?? 0,
        validationWarnings: parsedData.pnlValidation.failures.map(
          (f) => `${f.symbol}: calculated ${f.calculatedPnl.toFixed(2)} vs reported ${f.reportedPnl.toFixed(2)}`
        ),
        parsingWarnings: warnings,
        error: blockDecision.reason ?? "P&L validation failed",
      };
    }

    // Phase 5: Persist to database
    onProgress?.("PERSISTING", 80, "Saving to database...");

    const importId = await persistImport(parsedData, verbose);

    onProgress?.("COMPLETE", 100, "Import complete");

    return {
      success: true,
      importId,
      tradesImported: parsedData.tradesWithFees.length,
      closedPositionsImported: parsedData.pairedPositions.length,
      openPositionsImported: parsedData.openPositions.length,
      cashFlowsImported: parsedData.journalEntries.length,
      netLiquidity: parsedData.accountSummary.netLiquidity ?? 0,
      totalFees: parsedData.accountSummary.totalCommissionsAndFees ?? 0,
      validationWarnings: parsedData.pnlValidation.failures.map(
        (f) => `${f.symbol}: Δ$${f.discrepancy.toFixed(2)}`
      ),
      parsingWarnings: warnings,
    };
  } catch (error) {
    onProgress?.("FAILED", 0, `Import failed: ${error}`);

    return {
      success: false,
      tradesImported: 0,
      closedPositionsImported: 0,
      openPositionsImported: 0,
      cashFlowsImported: 0,
      netLiquidity: 0,
      totalFees: 0,
      validationWarnings: [],
      parsingWarnings: warnings,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse a document without persisting
 * Useful for validation and preview
 */
export async function parseDocument(
  document: ExtractedDocument,
  verbose = false
): Promise<ParsedImportData> {
  const warnings: string[] = [];
  const allItems = flattenDocument(document);
  const pageWidth = document.pages[0]?.width ?? 612;

  // Detect section boundaries
  const boundaries = detectSectionBoundaries(document);

  if (verbose) {
    console.log(`[Import] Detected sections: ${boundaries.presentSections.join(", ")}`);
    if (boundaries.missingSections.length > 0) {
      console.log(`[Import] Missing sections: ${boundaries.missingSections.join(", ")}`);
    }
  }

  if (!boundaries.isComplete) {
    warnings.push(...boundaries.warnings);
  }

  // Validate required sections
  const requiredValidation = validateRequiredSections(boundaries);
  if (!requiredValidation.isValid) {
    throw new Error(`Missing required sections: ${requiredValidation.errors.join(", ")}`);
  }

  // Extract account metadata from header
  const section1 = getSection(boundaries, "section1");
  const headerItems = section1?.items ?? allItems.slice(0, 50);
  const metadata = extractStatementMetadata(headerItems);

  // Fallback metadata extraction
  const accountNumber =
    metadata.accountNumber ?? extractAccountNumber(allItems) ?? "UNKNOWN";
  const statementDate =
    metadata.statementDate ?? extractStatementDate(allItems) ?? "";
  const [periodStart, periodEnd] = extractStatementPeriod(allItems);

  if (verbose) {
    console.log(`[Import] Account: ${accountNumber}, Date: ${statementDate}`);
  }

  // Parse Section 2 (Monthly Trade Confirmations)
  const section2Boundary = getSection(boundaries, "section2");
  const section2Result: Section2ParseResult | null = section2Boundary
    ? parseSection2(section2Boundary, pageWidth)
    : null;

  if (section2Result) {
    warnings.push(...section2Result.warnings);
    if (verbose) {
      console.log(`[Import] Section 2: ${section2Result.validTrades} trades`);
    }
  }

  // Parse Section 3 (Trade Confirmation Summary - optional)
  const section3Boundary = getSection(boundaries, "section3");
  const section3Result: Section3ParseResult | null = section3Boundary
    ? parseSection3(section3Boundary, pageWidth)
    : null;

  if (section3Result) {
    warnings.push(...section3Result.warnings);
    if (verbose) {
      console.log(`[Import] Section 3: ${section3Result.validSummaries} fee summaries`);
    }
  }

  // Parse Section 4 (Purchase and Sale)
  const section4Boundary = getSection(boundaries, "section4");
  const section4Result: Section4ParseResult | null = section4Boundary
    ? parseSection4(section4Boundary, pageWidth, periodStart ?? undefined, periodEnd ?? undefined)
    : null;

  if (section4Result) {
    warnings.push(...section4Result.warnings);
    if (verbose) {
      console.log(`[Import] Section 4: ${section4Result.validTrades} trades`);
    }
  }

  // Merge trades with deduplication
  const mergedTrades = mergeTradesWithDeduplication(
    section2Result?.trades ?? [],
    section4Result?.trades ?? []
  );

  if (mergedTrades.duplicatesRemoved > 0) {
    warnings.push(
      `Removed ${mergedTrades.duplicatesRemoved} duplicate trades between Section 2 and Section 4`
    );
  }

  // Debug: Log raw trades before conversion
  if (verbose) {
    console.log("=== RAW MERGED TRADES ===");
    console.log(`Total: ${mergedTrades.mergedTrades.length}`);
    const settlements = mergedTrades.mergedTrades.filter(t => t.tradeType === "Final Settlement");
    const regularTrades = mergedTrades.mergedTrades.filter(t => t.tradeType !== "Final Settlement");
    console.log(`Settlements: ${settlements.length}, Regular trades: ${regularTrades.length}`);

    // Break down by source and trade type
    const s2Settlements = (section2Result?.trades ?? []).filter(t => t.tradeType === "Final Settlement");
    const s4Settlements = (section4Result?.trades ?? []).filter(t => t.tradeType === "Final Settlement");
    console.log(`Section 2 settlements: ${s2Settlements.length}, Section 4 settlements: ${s4Settlements.length}`);

    // Group trades by symbol to understand position structure
    const bySymbol = new Map<string, typeof mergedTrades.mergedTrades>();
    for (const t of mergedTrades.mergedTrades) {
      const existing = bySymbol.get(t.symbol) ?? [];
      existing.push(t);
      bySymbol.set(t.symbol, existing);
    }

    // Create set of symbols that have settlements
    const settlementSymbols = new Set(settlements.map(s => s.symbol));
    console.log(`\n=== SETTLEMENT COVERAGE ===`);
    console.log(`Symbols with settlements: ${settlementSymbols.size}`);

    // Log symbols that have trades but NO settlements (potential issues)
    const symbolsWithoutSettlements = [...bySymbol.keys()].filter(s => !settlementSymbols.has(s));
    if (symbolsWithoutSettlements.length > 0) {
      console.log(`⚠️ Symbols with trades but NO settlement: ${symbolsWithoutSettlements.length}`);
      symbolsWithoutSettlements.forEach(s => {
        const trades = bySymbol.get(s) ?? [];
        const sides = [...new Set(trades.map(t => t.subtype))].join(',');
        console.log(`  - ${s} (${sides})`);
      });
    }

    // Log first 3 symbols with all their trades
    console.log("=== TRADES BY SYMBOL (first 3) ===");
    let count = 0;
    for (const [symbol, trades] of bySymbol) {
      if (count++ >= 3) break;
      console.log(`\n${symbol}:`);
      for (const t of trades) {
        console.log(`  - [${t.source}] ${t.tradeType}: ${t.subtype} qty=${t.qtyLong || t.qtyShort} @ ${t.tradePrice}`);
      }
    }
  }

  // Parse Section 5 (Purchase and Sale Summary - source of truth)
  const section5Boundary = getSection(boundaries, "section5");
  const section5Result: Section5ParseResult | null = section5Boundary
    ? parseSection5(section5Boundary, pageWidth)
    : null;

  if (section5Result) {
    warnings.push(...section5Result.warnings);
    if (verbose) {
      console.log(`[Import] Section 5: ${section5Result.pairedPositions.length} positions`);
    }
  }

  // Parse Section 6 (Journal Entries)
  const section6Boundary = getSection(boundaries, "section6");
  const section6Result: Section6ParseResult | null = section6Boundary
    ? parseSection6(section6Boundary, pageWidth)
    : null;

  if (section6Result) {
    warnings.push(...section6Result.warnings);
    if (verbose) {
      console.log(`[Import] Section 6: ${section6Result.validEntries} journal entries`);
    }
  }

  // Parse Section 7 (Open Positions - optional)
  const section7Boundary = getSection(boundaries, "section7");
  if (verbose) {
    console.log(`[Import] Section 7 boundary: ${section7Boundary ? `found (${section7Boundary.items.length} items)` : "NOT FOUND"}`);
  }
  const section7Result: Section7ParseResult | null = section7Boundary
    ? parseSection7(section7Boundary, pageWidth)
    : null;

  if (section7Result) {
    warnings.push(...section7Result.warnings);
    if (verbose) {
      console.log(`[Import] Section 7: ${section7Result.validPositions} open positions`);
      if (section7Result.warnings.length > 0) {
        console.log(`[Import] Section 7 warnings:`, section7Result.warnings);
      }
    }
  }

  // Parse Section 10 (Account Summary)
  const section10Boundary = getSection(boundaries, "section10");
  const section10Result: Section10ParseResult | null = section10Boundary
    ? parseSection10(section10Boundary, pageWidth)
    : null;

  if (section10Result) {
    warnings.push(...section10Result.warnings);
    if (verbose) {
      console.log(`[Import] Section 10: ${section10Result.fieldsFound} fields`);
    }
  }

  // Convert trades to TradeEntry format for FIFO calculation
  // Settlements need special handling to avoid duplicates:
  // - If statement has settlements for BOTH YES and NO sides, use them as-is
  // - If statement has settlement for only ONE side, generate the opposite side
  // - Cross-symbol settlements for sports games (e.g., MINCHI-MIN → MINCHI-CHI)
  let tradeEntries: TradeEntry[] = convertAllTradesToEntries(mergedTrades.mergedTrades);

  // Note: Section 5-derived settlements are no longer needed for most cases.
  // Round-trip trades (buy YES then sell YES) are now properly handled as:
  // - YES Trade → OPEN YES
  // - NO Trade → CLOSE YES (since sell YES = buy NO in statement format)

  // Debug: Log trade entries for analysis
  if (verbose) {
    console.log("=== TRADE ENTRIES FOR FIFO ===");
    console.log(`Total entries: ${tradeEntries.length} (from ${mergedTrades.mergedTrades.length} raw trades)`);
    const byType = { OPEN: 0, CLOSE: 0, SETTLE: 0 };
    const bySide = { YES: 0, NO: 0 };
    for (const entry of tradeEntries) {
      byType[entry.type]++;
      bySide[entry.side]++;
    }
    console.log("By type:", byType);
    console.log("By side:", bySide);

    // Check for sells (qtyShort > 0) in raw trades
    const sells = mergedTrades.mergedTrades.filter(t => t.qtyShort > 0 && t.tradeType !== "Final Settlement");
    if (sells.length > 0) {
      console.log(`\n⚠️ Sell trades found: ${sells.length}`);
      sells.slice(0, 5).forEach(s => {
        console.log(`  - ${s.symbol.substring(0, 30)}: ${s.subtype} qtyShort=${s.qtyShort} @ ${s.tradePrice}`);
      });
    } else {
      console.log(`\nℹ️ No sell trades (qtyShort > 0) found in regular trades`);
    }

    // Check for matching opens and settlements
    const openKeys = new Set(tradeEntries.filter(t => t.type === "OPEN").map(t => `${t.symbol}|${t.side}`));
    const settleKeys = new Set(tradeEntries.filter(t => t.type === "SETTLE").map(t => `${t.symbol}|${t.side}`));

    const unmatchedSettlements = [...settleKeys].filter(k => !openKeys.has(k));
    const unmatchedOpens = [...openKeys].filter(k => !settleKeys.has(k));

    if (unmatchedSettlements.length > 0) {
      console.log(`⚠️ Settlements without matching opens: ${unmatchedSettlements.length}`);
      unmatchedSettlements.slice(0, 5).forEach(k => console.log(`  - ${k}`));
    }
    if (unmatchedOpens.length > 0) {
      console.log(`ℹ️ Opens without settlements (may be open positions): ${unmatchedOpens.length}`);
    }

    // Log first few settlements to verify conversion
    const settlements = tradeEntries.filter(t => t.type === "SETTLE").slice(0, 5);
    console.log("Sample settlements:", settlements.map(s => ({
      symbol: s.symbol.substring(0, 30),
      side: s.side,
      price: s.price,
      qty: s.quantity,
    })));

    // Log first few opens to verify
    const opens = tradeEntries.filter(t => t.type === "OPEN").slice(0, 5);
    console.log("Sample opens:", opens.map(o => ({
      symbol: o.symbol.substring(0, 30),
      side: o.side,
      price: o.price,
      qty: o.quantity,
    })));
  }

  // Attribute fees from Section 3
  const feeAttribution = attributeFees(
    tradeEntries,
    section3Result?.summaries ?? []
  );

  if (feeAttribution.warnings.length > 0) {
    warnings.push(...feeAttribution.warnings);
  }

  // Validate Section 3 fees against Section 10 total (if available)
  if (verbose || section10Result?.summary?.totalCommissionsAndFees) {
    const section3TotalFees = feeAttribution.totalFeesAvailable;
    const section10TotalFees = section10Result?.summary?.totalCommissionsAndFees ?? 0;

    console.log("=== FEE VALIDATION ===");
    console.log(`Section 3 total fees: $${section3TotalFees.toFixed(2)}`);
    console.log(`Section 10 total fees: $${section10TotalFees.toFixed(2)}`);
    console.log(`Fees attributed to trades: $${feeAttribution.totalFeesAttributed.toFixed(2)}`);

    if (Math.abs(section3TotalFees - section10TotalFees) > 1.0) {
      const discrepancy = Math.abs(section3TotalFees - section10TotalFees);
      warnings.push(
        `Fee parsing discrepancy: Section 3 shows $${section3TotalFees.toFixed(2)} but Section 10 shows $${section10TotalFees.toFixed(2)} (Δ$${discrepancy.toFixed(2)})`
      );
      console.log(`⚠️ SIGNIFICANT FEE DISCREPANCY: Section 3 parsing may be failing`);
      console.log(`  Section 3 summaries parsed: ${section3Result?.summaries?.length ?? 0}`);
      if (section3Result?.layout) {
        console.log(`  Section 3 column layout detected: ${section3Result.layout.columns.map(c => c.name).join(", ")}`);
      }
    }
  }

  // Calculate P&L using FIFO
  const fifoResults = calculateAllPositions(feeAttribution.trades);

  if (verbose) {
    const totals = getTotalPnl(fifoResults);
    console.log(`[Import] FIFO calculated: Gross ${totals.grossPnl.toFixed(2)}, Net ${totals.netPnl.toFixed(2)}`);

    // Log FIFO results by symbol
    console.log("=== FIFO RESULTS ===");
    console.log(`Total position groups: ${fifoResults.size}`);
    for (const [key, result] of fifoResults) {
      if (result.totalGrossPnl !== 0 || result.closedLots.length > 0 || result.openLots.length > 0) {
        console.log(`${key}: closed=${result.closedLots.length} lots, open=${result.openLots.length} lots, pnl=${result.totalGrossPnl.toFixed(2)}`);
      }
    }

    // Log positions with 0 closed lots but non-zero trades
    const emptyResults = Array.from(fifoResults.entries())
      .filter(([, r]) => r.closedLots.length === 0 && r.openLots.length === 0);
    if (emptyResults.length > 0) {
      console.log(`FIFO results with no activity: ${emptyResults.length}`);
    }
  }

  // Validate against Section 5
  const pnlValidation = validatePnlAgainstSection5(
    fifoResults,
    section5Result?.pairedPositions ?? []
  );

  // Check which Section 5 positions have no matching settlements
  if (verbose && section5Result?.pairedPositions) {
    const settlementSymbols = new Set(
      tradeEntries.filter(t => t.type === "SETTLE").map(t => t.symbol)
    );
    const s5WithoutSettlement = section5Result.pairedPositions.filter(
      p => !settlementSymbols.has(p.symbol)
    );
    if (s5WithoutSettlement.length > 0) {
      console.log(`\n=== SECTION 5 POSITIONS WITHOUT SETTLEMENTS ===`);
      console.log(`${s5WithoutSettlement.length} positions in Section 5 have no settlement record:`);
      s5WithoutSettlement.forEach(p => {
        const yesInfo = p.yesRow ? `YES: ${p.yesRow.grossPnl?.toFixed(2)}` : '';
        const noInfo = p.noRow ? `NO: ${p.noRow.grossPnl?.toFixed(2)}` : '';
        console.log(`  - ${p.symbol}: ${yesInfo} ${noInfo} (net: ${p.netPnl.toFixed(2)})`);
      });
    }
  }

  if (!pnlValidation.isValid && verbose) {
    console.log(`[Import] P&L validation: ${pnlValidation.failures.length} discrepancies`);

    // Log detailed comparison for ALL failures (to debug both-sided issues)
    console.log("=== P&L COMPARISON (all failures) ===");
    for (const failure of pnlValidation.failures) {
      console.log(`\n${failure.symbol}:`);
      console.log(`  Reported (Section 5): ${failure.reportedPnl.toFixed(2)}`);
      console.log(`  Calculated (FIFO): ${failure.calculatedPnl.toFixed(2)}`);
      console.log(`  Discrepancy: ${failure.discrepancy.toFixed(2)}`);

      // Find Section 5 details
      const s5Position = section5Result?.pairedPositions?.find(p => p.symbol === failure.symbol);
      if (s5Position) {
        const yesQty = (s5Position.yesRow?.totalQtyLong ?? 0) + (s5Position.yesRow?.totalQtyShort ?? 0);
        const noQty = (s5Position.noRow?.totalQtyLong ?? 0) + (s5Position.noRow?.totalQtyShort ?? 0);
        console.log(`  Section 5 YES: qty=${yesQty}, pnl=${s5Position.yesRow?.grossPnl?.toFixed(2) ?? 'N/A'}`);
        console.log(`  Section 5 NO: qty=${noQty}, pnl=${s5Position.noRow?.grossPnl?.toFixed(2) ?? 'N/A'}`);
        console.log(`  Both-sided: ${s5Position.yesRow !== null && s5Position.noRow !== null}`);
      }

      // Find FIFO results for this symbol
      const fifoYes = fifoResults.get(`${failure.symbol}|YES`);
      const fifoNo = fifoResults.get(`${failure.symbol}|NO`);
      console.log(`  FIFO YES: pnl=${fifoYes?.totalGrossPnl?.toFixed(2) ?? '0.00'}, closed=${fifoYes?.closedLots?.length ?? 0}, open=${fifoYes?.openLots?.length ?? 0}`);
      console.log(`  FIFO NO: pnl=${fifoNo?.totalGrossPnl?.toFixed(2) ?? '0.00'}, closed=${fifoNo?.closedLots?.length ?? 0}, open=${fifoNo?.openLots?.length ?? 0}`);

      // Find raw trades for this symbol
      const symbolTrades = mergedTrades.mergedTrades.filter(t => t.symbol === failure.symbol);
      const opens = symbolTrades.filter(t => t.tradeType !== "Final Settlement");
      const settlements = symbolTrades.filter(t => t.tradeType === "Final Settlement");
      console.log(`  Raw trades: ${opens.length} opens, ${settlements.length} settlements`);
      if (settlements.length > 0) {
        settlements.forEach(s => {
          console.log(`    Settlement: ${s.subtype} @ ${s.tradePrice?.toFixed(2)} qty=${s.qtyLong || s.qtyShort}`);
        });
      }
      if (opens.length > 0) {
        opens.forEach(o => {
          console.log(`    Open: ${o.subtype} @ ${o.tradePrice?.toFixed(2)} qty=${o.qtyLong || o.qtyShort}`);
        });
      }
    }
  }

  return {
    accountNumber,
    statementDate,
    periodStart: periodStart ?? statementDate,
    periodEnd: periodEnd ?? statementDate,
    accountSummary: section10Result?.summary ?? createEmptyAccountSummary(),
    tradesWithFees: feeAttribution.trades,
    pairedPositions: section5Result?.pairedPositions ?? [],
    journalEntries: section6Result?.entries ?? [],
    openPositions: section7Result?.positions ?? [],
    feeSummaries: section3Result?.summaries ?? [],
    fifoResults,
    pnlValidation,
    feeAttribution,
    warnings,
  };
}

// ============================================================================
// PERSISTENCE
// ============================================================================

/**
 * Persist parsed data to database in a transaction
 */
async function persistImport(
  data: ParsedImportData,
  verbose = false
): Promise<string> {
  return transaction(async () => {
    const importId = generateId();

    // 1. Create statement import record
    const statementInput: CreateStatementImportInput = {
      id: importId,
      platform: "robinhood" as Platform,
      account_number: data.accountNumber,
      statement_date: data.statementDate,
      statement_period_start: data.periodStart,
      statement_period_end: data.periodEnd,
      parser_version: "v1.0",
      net_liquidity: data.accountSummary.netLiquidity ?? undefined,
      total_fees: data.accountSummary.totalCommissionsAndFees ?? undefined,
      ending_cash: data.accountSummary.endingCashBalance ?? undefined,
    };

    await createStatementImport(statementInput);

    if (verbose) {
      console.log(`[Import] Created statement import: ${importId}`);
    }

    // 2. Create trades
    const tradeInputs: CreateTradeInput[] = data.tradesWithFees.map((trade) => ({
      import_id: importId,
      platform: "robinhood" as Platform,
      account_id: data.accountNumber,
      trade_date: trade.date,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      fees: trade.totalFees,
      trade_type: trade.type === "OPEN" ? "OPEN" : trade.type === "CLOSE" ? "CLOSE" : undefined,
      category: categorizeSymbol(trade.symbol),
      settlement_date: trade.type === "SETTLE" ? trade.date : undefined,
      settlement_price: trade.settlementPrice,
      platform_metadata: {
        originalType: trade.type,
        feesAttributed: trade.feesAttributed,
      },
    }));

    if (tradeInputs.length > 0) {
      await createTrades(tradeInputs);
      if (verbose) {
        console.log(`[Import] Created ${tradeInputs.length} trades`);
      }
    }

    // 3. Create closed positions
    const closedPositionInputs: CreateClosedPositionInput[] = data.pairedPositions.map(
      (position) => {
        // Find the calculated P&L for this position
        const fifoKey = position.symbol;
        let calculatedPnl = 0;
        for (const [key, result] of data.fifoResults) {
          if (key.startsWith(fifoKey)) {
            calculatedPnl += result.totalGrossPnl;
          }
        }

        const reconciliation = createReconciliationRecord({
          symbol: position.symbol,
          expDate: position.expDate,
          calculatedPnl,
          reportedPnl: position.netPnl,
          discrepancy: Math.abs(calculatedPnl - position.netPnl),
          isValid: Math.abs(calculatedPnl - position.netPnl) <= 0.01,
          discrepancyPercent: null,
        });

        return {
          import_id: importId,
          platform: "robinhood" as Platform,
          symbol: position.symbol,
          entry_date: position.yesRow?.tradeDate ?? position.noRow?.tradeDate,
          exit_date: position.expDate ?? undefined,
          quantity: position.totalQuantity,
          gross_pnl: position.netPnl,
          fees: 0, // Fees are on trades
          net_pnl: position.netPnl,
          calculated_pnl: reconciliation.calculated_pnl,
          pnl_discrepancy: reconciliation.pnl_discrepancy,
        };
      }
    );

    if (closedPositionInputs.length > 0) {
      await createClosedPositions(closedPositionInputs);
      if (verbose) {
        console.log(`[Import] Created ${closedPositionInputs.length} closed positions`);
      }
    }

    // 4. Create cash flows
    const cashFlowInputs: CreateCashFlowInput[] = data.journalEntries.map((entry) => {
      const journalEntry = toJournalEntry(entry);
      // Map "OTHER" to "ADJUSTMENT" for database compatibility
      const dbType = journalEntry.type === "OTHER" ? "ADJUSTMENT" : journalEntry.type;
      return {
        import_id: importId,
        date: journalEntry.date,
        type: dbType as CreateCashFlowInput["type"],
        amount: journalEntry.amount,
        description: journalEntry.description,
      };
    });

    if (cashFlowInputs.length > 0) {
      await createCashFlows(cashFlowInputs);
      if (verbose) {
        console.log(`[Import] Created ${cashFlowInputs.length} cash flows`);
      }
    }

    // 5. Create open positions
    const openPositionInputs: CreateOpenPositionInput[] = data.openPositions.map(
      (position) => {
        const row = toOpenPositionRow(position, data.statementDate);
        return {
          import_id: importId,
          snapshot_date: data.statementDate,
          symbol: position.symbol,
          side: position.subtype,
          quantity: row.quantity,
          cost_basis: row.costBasis,
          current_price: row.currentPrice,
          market_value: row.marketValue,
          unrealized_pnl: row.unrealizedPnl,
        };
      }
    );

    if (openPositionInputs.length > 0) {
      await createOpenPositions(openPositionInputs);
      if (verbose) {
        console.log(`[Import] Created ${openPositionInputs.length} open positions`);
      }
    }

    return importId;
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert all trades to TradeEntry format for FIFO calculation
 *
 * CRITICAL INSIGHT: Robinhood represents "selling" as "buying the opposite side".
 * - Selling YES @ $0.30 is shown as: buying NO @ $0.70 (since YES + NO = $1.00)
 * - Selling NO @ $0.40 is shown as: buying YES @ $0.60
 *
 * So when we see a "Trade" (not "Final Settlement"):
 * - YES Trade could be: Opening YES OR Closing NO (by selling NO)
 * - NO Trade could be: Opening NO OR Closing YES (by selling YES)
 *
 * Strategy: Match YES and NO trades by symbol to identify round-trips.
 * If YES qty matches NO qty, treat it as: OPEN YES → CLOSE YES (via the NO trade).
 */
function convertAllTradesToEntries(
  trades: (TradeConfirmation | PurchaseSaleTrade)[]
): TradeEntry[] {
  const entries: TradeEntry[] = [];

  // First pass: identify settlements and group regular trades by symbol
  const existingSettlements = new Set<string>();
  const settlementsBySymbol = new Map<string, { side: string; price: number; date: string; quantity: number }>();
  const tradesBySymbol = new Map<string, (TradeConfirmation | PurchaseSaleTrade)[]>();

  for (const trade of trades) {
    if (trade.tradeType === "Final Settlement") {
      const key = `${trade.symbol}|${trade.subtype}`;
      existingSettlements.add(key);
      settlementsBySymbol.set(trade.symbol, {
        side: trade.subtype,
        price: trade.tradePrice ?? 0,
        date: trade.tradeDate,
        quantity: trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort,
      });
    } else {
      const existing = tradesBySymbol.get(trade.symbol) ?? [];
      existing.push(trade);
      tradesBySymbol.set(trade.symbol, existing);
    }
  }

  // Collect all unique symbols (for cross-symbol settlement logic)
  const allSymbols = new Set<string>();
  for (const trade of trades) {
    allSymbols.add(trade.symbol);
  }

  // Track which synthetic settlements we've already generated
  const generatedSyntheticSettlements = new Set<string>();

  // Second pass: process regular trades with sell-as-buy-opposite logic
  for (const [symbol, symbolTrades] of tradesBySymbol) {
    // Separate YES and NO trades
    const yesTrades = symbolTrades.filter(t => t.subtype === "YES");
    const noTrades = symbolTrades.filter(t => t.subtype === "NO");

    // Calculate total quantities
    const yesQty = yesTrades.reduce((sum, t) => sum + (t.qtyLong > 0 ? t.qtyLong : t.qtyShort), 0);
    const noQty = noTrades.reduce((sum, t) => sum + (t.qtyLong > 0 ? t.qtyLong : t.qtyShort), 0);

    // Determine if this is a round-trip scenario
    // If we have both YES and NO trades with matching quantities, it's a round-trip
    const isRoundTrip = yesTrades.length > 0 && noTrades.length > 0 && yesQty === noQty;

    if (isRoundTrip) {
      console.log(`[Round-Trip] ${symbol.substring(0, 35)}: YES qty=${yesQty}, NO qty=${noQty} → treating as YES open+close`);

      // YES trades are OPENS
      for (const trade of yesTrades) {
        const quantity = trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort;
        entries.push({
          date: trade.tradeDate,
          symbol: trade.symbol,
          side: "YES",
          quantity,
          price: trade.tradePrice ?? 0,
          type: "OPEN" as const,
          fees: 0,
        });
      }

      // NO trades are actually CLOSES of YES (sell YES = buy NO)
      // Close price = 1 - NO_price (the actual sell price)
      for (const trade of noTrades) {
        const quantity = trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort;
        const closePrice = 1 - (trade.tradePrice ?? 0);
        entries.push({
          date: trade.tradeDate,
          symbol: trade.symbol,
          side: "YES", // Closing the YES position
          quantity,
          price: closePrice,
          type: "CLOSE" as const,
          fees: 0,
        });
        console.log(`[Sell-as-Buy] ${symbol.substring(0, 30)}: NO @ $${(trade.tradePrice ?? 0).toFixed(2)} → CLOSE YES @ $${closePrice.toFixed(2)}`);
      }
    } else if (yesTrades.length > 0 && noTrades.length > 0) {
      // Mixed scenario: partial closes or genuine both-sided position
      // Use FIFO matching: process in chronological order
      console.log(`[Mixed] ${symbol.substring(0, 35)}: YES qty=${yesQty}, NO qty=${noQty} → processing with FIFO matching`);

      // Sort all trades by date
      const allTrades = [...symbolTrades].sort((a, b) =>
        new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
      );

      // Track open positions to determine if trades are opens or closes
      let openYes = 0;
      let openNo = 0;

      for (const trade of allTrades) {
        const quantity = trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort;
        const side = trade.subtype;
        const price = trade.tradePrice ?? 0;

        if (side === "YES") {
          if (openNo > 0) {
            // This YES trade might be closing a NO position (sell NO = buy YES)
            const closeQty = Math.min(quantity, openNo);
            const closePrice = 1 - price; // Actual sell price
            if (closeQty > 0) {
              entries.push({
                date: trade.tradeDate,
                symbol: trade.symbol,
                side: "NO",
                quantity: closeQty,
                price: closePrice,
                type: "CLOSE" as const,
                fees: 0,
              });
              openNo -= closeQty;
            }
            // Remaining quantity opens new YES position
            const openQty = quantity - closeQty;
            if (openQty > 0) {
              entries.push({
                date: trade.tradeDate,
                symbol: trade.symbol,
                side: "YES",
                quantity: openQty,
                price,
                type: "OPEN" as const,
                fees: 0,
              });
              openYes += openQty;
            }
          } else {
            // No open NO position, so this is opening YES
            entries.push({
              date: trade.tradeDate,
              symbol: trade.symbol,
              side: "YES",
              quantity,
              price,
              type: "OPEN" as const,
              fees: 0,
            });
            openYes += quantity;
          }
        } else {
          // NO trade
          if (openYes > 0) {
            // This NO trade might be closing a YES position (sell YES = buy NO)
            const closeQty = Math.min(quantity, openYes);
            const closePrice = 1 - price; // Actual sell price
            if (closeQty > 0) {
              entries.push({
                date: trade.tradeDate,
                symbol: trade.symbol,
                side: "YES",
                quantity: closeQty,
                price: closePrice,
                type: "CLOSE" as const,
                fees: 0,
              });
              openYes -= closeQty;
              console.log(`[Sell-as-Buy] ${symbol.substring(0, 30)}: NO @ $${price.toFixed(2)} → CLOSE YES @ $${closePrice.toFixed(2)} qty=${closeQty}`);
            }
            // Remaining quantity opens new NO position
            const openQty = quantity - closeQty;
            if (openQty > 0) {
              entries.push({
                date: trade.tradeDate,
                symbol: trade.symbol,
                side: "NO",
                quantity: openQty,
                price,
                type: "OPEN" as const,
                fees: 0,
              });
              openNo += openQty;
            }
          } else {
            // No open YES position, so this is opening NO
            entries.push({
              date: trade.tradeDate,
              symbol: trade.symbol,
              side: "NO",
              quantity,
              price,
              type: "OPEN" as const,
              fees: 0,
            });
            openNo += quantity;
          }
        }
      }
    } else {
      // Only one side has trades - straightforward opens
      for (const trade of symbolTrades) {
        const quantity = trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort;
        entries.push({
          date: trade.tradeDate,
          symbol: trade.symbol,
          side: trade.subtype,
          quantity,
          price: trade.tradePrice ?? 0,
          type: "OPEN" as const,
          fees: 0,
        });
      }
    }
  }

  // Third pass: process settlements
  for (const trade of trades) {
    if (trade.tradeType !== "Final Settlement") continue;

    const quantity = trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort;
    const statementSide = trade.subtype;
    const statementPrice = trade.tradePrice ?? 0;
    const oppositeSide = statementSide === "YES" ? "NO" : "YES";
    const oppositePrice = 1 - statementPrice;

    const oppositeKey = `${trade.symbol}|${oppositeSide}`;

    // Always add the settlement for the statement side
    entries.push({
      date: trade.tradeDate,
      symbol: trade.symbol,
      side: statementSide,
      quantity,
      price: statementPrice,
      type: "SETTLE" as const,
      settlementPrice: statementPrice,
      fees: 0,
    });

    // Generate opposite side settlement if needed
    if (!existingSettlements.has(oppositeKey) && !generatedSyntheticSettlements.has(oppositeKey)) {
      entries.push({
        date: trade.tradeDate,
        symbol: trade.symbol,
        side: oppositeSide,
        quantity,
        price: oppositePrice,
        type: "SETTLE" as const,
        settlementPrice: oppositePrice,
        fees: 0,
      });
      generatedSyntheticSettlements.add(oppositeKey);
    }

    // Cross-symbol settlements for sports games
    const opposingSymbol = findOpposingTeamSymbol(trade.symbol, allSymbols);
    if (opposingSymbol && !settlementsBySymbol.has(opposingSymbol)) {
      const opposingYesPrice = statementSide === "NO" ? statementPrice : oppositePrice;
      const opposingNoPrice = 1 - opposingYesPrice;

      const opposingYesKey = `${opposingSymbol}|YES`;
      const opposingNoKey = `${opposingSymbol}|NO`;

      if (!generatedSyntheticSettlements.has(opposingYesKey)) {
        entries.push({
          date: trade.tradeDate,
          symbol: opposingSymbol,
          side: "YES",
          quantity,
          price: opposingYesPrice,
          type: "SETTLE" as const,
          settlementPrice: opposingYesPrice,
          fees: 0,
        });
        generatedSyntheticSettlements.add(opposingYesKey);
      }

      if (!generatedSyntheticSettlements.has(opposingNoKey)) {
        entries.push({
          date: trade.tradeDate,
          symbol: opposingSymbol,
          side: "NO",
          quantity,
          price: opposingNoPrice,
          type: "SETTLE" as const,
          settlementPrice: opposingNoPrice,
          fees: 0,
        });
        generatedSyntheticSettlements.add(opposingNoKey);
      }
    }
  }

  return entries;
}

/**
 * Find the opposing team's symbol for sports games.
 *
 * Symbol format: KXGAMETYPE-DATEAABBCC-TEAM
 * Example: KXNFLGAME-25SEP08MINCHI-MIN and KXNFLGAME-25SEP08MINCHI-CHI
 *
 * The game ID contains both team codes (MINCHI = MIN vs CHI).
 * Given one team's symbol, find the other team's symbol if it exists.
 */
function findOpposingTeamSymbol(symbol: string, allSymbols: Set<string>): string | null {
  // Extract the base (everything before the last dash) and team code (after last dash)
  const lastDashIndex = symbol.lastIndexOf('-');
  if (lastDashIndex === -1) return null;

  const baseSymbol = symbol.substring(0, lastDashIndex); // e.g., "KXNFLGAME-25SEP08MINCHI"
  const teamCode = symbol.substring(lastDashIndex + 1); // e.g., "MIN"

  // Try to extract the two team codes from the base symbol
  // Common patterns: MINCHI (MIN vs CHI), KCLAC (KC vs LAC), TBHOU (TB vs HOU)
  // The team codes are typically 2-4 characters each, combined at the end

  // Find other symbols with the same base
  for (const otherSymbol of allSymbols) {
    if (otherSymbol === symbol) continue;

    const otherLastDash = otherSymbol.lastIndexOf('-');
    if (otherLastDash === -1) continue;

    const otherBase = otherSymbol.substring(0, otherLastDash);
    const otherTeam = otherSymbol.substring(otherLastDash + 1);

    // If same base but different team, this is the opposing symbol
    if (otherBase === baseSymbol && otherTeam !== teamCode) {
      return otherSymbol;
    }
  }

  return null;
}

/**
 * Create empty account summary
 */
function createEmptyAccountSummary(): AccountSummaryRaw {
  return {
    beginningCashBalance: null,
    commissions: null,
    exchangeFees: null,
    nfaFees: null,
    totalCommissionsAndFees: null,
    grossProfitAndLoss: null,
    eventContractTradeCosts: null,
    cashActivity: null,
    endingCashBalance: null,
    openTradeEquity: null,
    totalEquity: null,
    netLiquidity: null,
    eventContractsMarketValue: null,
    initialMargin: null,
    marginExcessDeficit: null,
    marginCall: null,
  };
}
