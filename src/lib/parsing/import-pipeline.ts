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

  // Debug: Log trade summary
  if (verbose) {
    const settlements = mergedTrades.mergedTrades.filter(t => t.tradeType === "Final Settlement");
    const regularTrades = mergedTrades.mergedTrades.filter(t => t.tradeType !== "Final Settlement");
    console.log(`[Import] Merged trades: ${regularTrades.length} regular, ${settlements.length} settlements`);
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
  const section7Result: Section7ParseResult | null = section7Boundary
    ? parseSection7(section7Boundary, pageWidth)
    : null;

  if (section7Result) {
    warnings.push(...section7Result.warnings);
    if (verbose) {
      console.log(`[Import] Section 7: ${section7Result.validPositions} open positions`);
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

  // Debug: Log trade entry summary
  if (verbose) {
    const byType = { OPEN: 0, CLOSE: 0, SETTLE: 0 };
    for (const entry of tradeEntries) byType[entry.type]++;
    console.log(`[Import] Trade entries: ${tradeEntries.length} (OPEN: ${byType.OPEN}, CLOSE: ${byType.CLOSE}, SETTLE: ${byType.SETTLE})`);
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
  const section3TotalFees = feeAttribution.totalFeesAvailable;
  const section10TotalFees = section10Result?.summary?.totalCommissionsAndFees ?? 0;

  if (verbose) {
    console.log(`[Import] Fees: S3=$${section3TotalFees.toFixed(2)}, S10=$${section10TotalFees.toFixed(2)}, attributed=$${feeAttribution.totalFeesAttributed.toFixed(2)}`);
  }

  if (Math.abs(section3TotalFees - section10TotalFees) > 1.0) {
    const discrepancy = Math.abs(section3TotalFees - section10TotalFees);
    warnings.push(
      `Fee parsing discrepancy: Section 3 shows $${section3TotalFees.toFixed(2)} but Section 10 shows $${section10TotalFees.toFixed(2)} (Δ$${discrepancy.toFixed(2)})`
    );
  }

  // Calculate P&L using FIFO
  const fifoResults = calculateAllPositions(feeAttribution.trades);

  if (verbose) {
    const totals = getTotalPnl(fifoResults);
    console.log(`[Import] FIFO: ${fifoResults.size} positions, gross=$${totals.grossPnl.toFixed(2)}, net=$${totals.netPnl.toFixed(2)}`);
  }

  // Validate against Section 5
  const pnlValidation = validatePnlAgainstSection5(
    fifoResults,
    section5Result?.pairedPositions ?? []
  );

  if (verbose && !pnlValidation.isValid) {
    console.log(`[Import] P&L validation: ${pnlValidation.failures.length} discrepancies`);
    // Log top 3 discrepancies for debugging
    pnlValidation.failures.slice(0, 3).forEach(f => {
      console.log(`  ${f.symbol.substring(0, 40)}: calc=$${f.calculatedPnl.toFixed(2)} vs reported=$${f.reportedPnl.toFixed(2)} (Δ$${f.discrepancy.toFixed(2)})`);
    });
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

/** Context passed between trade conversion functions */
interface TradeConversionContext {
  existingSettlements: Set<string>;
  settlementsBySymbol: Map<string, { side: string; price: number; date: string; quantity: number }>;
  allSymbols: Set<string>;
  generatedSyntheticSettlements: Set<string>;
}

/** Get trade quantity from either qtyLong or qtyShort */
function getTradeQuantity(trade: TradeConfirmation | PurchaseSaleTrade): number {
  return trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort;
}

/** Create a TradeEntry from common parameters */
function createEntry(
  date: string,
  symbol: string,
  side: "YES" | "NO",
  quantity: number,
  price: number,
  type: "OPEN" | "CLOSE" | "SETTLE",
  settlementPrice?: number
): TradeEntry {
  return {
    date,
    symbol,
    side,
    quantity,
    price,
    type,
    ...(settlementPrice !== undefined && { settlementPrice }),
    fees: 0,
  };
}

/**
 * Process round-trip trades (buy YES then sell YES).
 * YES trades become OPENS, NO trades become CLOSES of YES (sell-as-buy-opposite).
 */
function processRoundTripTrades(
  yesTrades: (TradeConfirmation | PurchaseSaleTrade)[],
  noTrades: (TradeConfirmation | PurchaseSaleTrade)[]
): TradeEntry[] {
  const entries: TradeEntry[] = [];

  // YES trades are OPENS
  for (const trade of yesTrades) {
    entries.push(createEntry(
      trade.tradeDate,
      trade.symbol,
      "YES",
      getTradeQuantity(trade),
      trade.tradePrice ?? 0,
      "OPEN"
    ));
  }

  // NO trades are CLOSES of YES (sell YES = buy NO)
  // Close price = 1 - NO_price (the actual sell price)
  for (const trade of noTrades) {
    const closePrice = 1 - (trade.tradePrice ?? 0);
    entries.push(createEntry(
      trade.tradeDate,
      trade.symbol,
      "YES",
      getTradeQuantity(trade),
      closePrice,
      "CLOSE"
    ));
  }

  return entries;
}

/**
 * Process mixed-scenario trades (partial closes or genuine both-sided position).
 * Uses FIFO matching in chronological order.
 */
function processMixedTrades(
  symbolTrades: (TradeConfirmation | PurchaseSaleTrade)[]
): TradeEntry[] {
  const entries: TradeEntry[] = [];

  // Sort all trades by date
  const sortedTrades = [...symbolTrades].sort((a, b) =>
    new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
  );

  // Track open positions to determine if trades are opens or closes
  let openYes = 0;
  let openNo = 0;

  for (const trade of sortedTrades) {
    const quantity = getTradeQuantity(trade);
    const side = trade.subtype;
    const price = trade.tradePrice ?? 0;

    if (side === "YES") {
      if (openNo > 0) {
        // This YES trade might be closing a NO position (sell NO = buy YES)
        const closeQty = Math.min(quantity, openNo);
        const closePrice = 1 - price;
        if (closeQty > 0) {
          entries.push(createEntry(trade.tradeDate, trade.symbol, "NO", closeQty, closePrice, "CLOSE"));
          openNo -= closeQty;
        }
        // Remaining quantity opens new YES position
        const openQty = quantity - closeQty;
        if (openQty > 0) {
          entries.push(createEntry(trade.tradeDate, trade.symbol, "YES", openQty, price, "OPEN"));
          openYes += openQty;
        }
      } else {
        entries.push(createEntry(trade.tradeDate, trade.symbol, "YES", quantity, price, "OPEN"));
        openYes += quantity;
      }
    } else {
      // NO trade
      if (openYes > 0) {
        // This NO trade might be closing a YES position (sell YES = buy NO)
        const closeQty = Math.min(quantity, openYes);
        const closePrice = 1 - price;
        if (closeQty > 0) {
          entries.push(createEntry(trade.tradeDate, trade.symbol, "YES", closeQty, closePrice, "CLOSE"));
          openYes -= closeQty;
        }
        // Remaining quantity opens new NO position
        const openQty = quantity - closeQty;
        if (openQty > 0) {
          entries.push(createEntry(trade.tradeDate, trade.symbol, "NO", openQty, price, "OPEN"));
          openNo += openQty;
        }
      } else {
        entries.push(createEntry(trade.tradeDate, trade.symbol, "NO", quantity, price, "OPEN"));
        openNo += quantity;
      }
    }
  }

  return entries;
}

/**
 * Process single-side trades (straightforward opens).
 */
function processSingleSideTrades(
  trades: (TradeConfirmation | PurchaseSaleTrade)[]
): TradeEntry[] {
  return trades.map(trade => createEntry(
    trade.tradeDate,
    trade.symbol,
    trade.subtype as "YES" | "NO",
    getTradeQuantity(trade),
    trade.tradePrice ?? 0,
    "OPEN"
  ));
}

/**
 * Process settlement and generate synthetic settlements for opposite side and cross-symbol.
 */
function processSettlement(
  trade: TradeConfirmation | PurchaseSaleTrade,
  ctx: TradeConversionContext
): TradeEntry[] {
  const entries: TradeEntry[] = [];
  const quantity = getTradeQuantity(trade);
  const statementSide = trade.subtype as "YES" | "NO";
  const statementPrice = trade.tradePrice ?? 0;
  const oppositeSide = statementSide === "YES" ? "NO" : "YES";
  const oppositePrice = 1 - statementPrice;

  // Add settlement for the statement side
  entries.push(createEntry(
    trade.tradeDate,
    trade.symbol,
    statementSide,
    quantity,
    statementPrice,
    "SETTLE",
    statementPrice
  ));

  // Generate opposite side settlement if needed
  const oppositeKey = `${trade.symbol}|${oppositeSide}`;
  if (!ctx.existingSettlements.has(oppositeKey) && !ctx.generatedSyntheticSettlements.has(oppositeKey)) {
    entries.push(createEntry(
      trade.tradeDate,
      trade.symbol,
      oppositeSide,
      quantity,
      oppositePrice,
      "SETTLE",
      oppositePrice
    ));
    ctx.generatedSyntheticSettlements.add(oppositeKey);
  }

  // Cross-symbol settlements for sports games
  const opposingSymbol = findOpposingTeamSymbol(trade.symbol, ctx.allSymbols);
  if (opposingSymbol && !ctx.settlementsBySymbol.has(opposingSymbol)) {
    const opposingYesPrice = statementSide === "NO" ? statementPrice : oppositePrice;
    const opposingNoPrice = 1 - opposingYesPrice;

    const opposingYesKey = `${opposingSymbol}|YES`;
    const opposingNoKey = `${opposingSymbol}|NO`;

    if (!ctx.generatedSyntheticSettlements.has(opposingYesKey)) {
      entries.push(createEntry(trade.tradeDate, opposingSymbol, "YES", quantity, opposingYesPrice, "SETTLE", opposingYesPrice));
      ctx.generatedSyntheticSettlements.add(opposingYesKey);
    }

    if (!ctx.generatedSyntheticSettlements.has(opposingNoKey)) {
      entries.push(createEntry(trade.tradeDate, opposingSymbol, "NO", quantity, opposingNoPrice, "SETTLE", opposingNoPrice));
      ctx.generatedSyntheticSettlements.add(opposingNoKey);
    }
  }

  return entries;
}

/**
 * Convert all trades to TradeEntry format for FIFO calculation.
 *
 * CRITICAL INSIGHT: Robinhood represents "selling" as "buying the opposite side".
 * - Selling YES @ $0.30 is shown as: buying NO @ $0.70 (since YES + NO = $1.00)
 * - Selling NO @ $0.40 is shown as: buying YES @ $0.60
 *
 * Strategy: Match YES and NO trades by symbol to identify round-trips.
 * If YES qty matches NO qty, treat it as: OPEN YES → CLOSE YES (via the NO trade).
 */
function convertAllTradesToEntries(
  trades: (TradeConfirmation | PurchaseSaleTrade)[]
): TradeEntry[] {
  const entries: TradeEntry[] = [];

  // Build context: identify settlements and group regular trades by symbol
  const ctx: TradeConversionContext = {
    existingSettlements: new Set(),
    settlementsBySymbol: new Map(),
    allSymbols: new Set(trades.map(t => t.symbol)),
    generatedSyntheticSettlements: new Set(),
  };

  const tradesBySymbol = new Map<string, (TradeConfirmation | PurchaseSaleTrade)[]>();

  for (const trade of trades) {
    if (trade.tradeType === "Final Settlement") {
      const key = `${trade.symbol}|${trade.subtype}`;
      ctx.existingSettlements.add(key);
      ctx.settlementsBySymbol.set(trade.symbol, {
        side: trade.subtype,
        price: trade.tradePrice ?? 0,
        date: trade.tradeDate,
        quantity: getTradeQuantity(trade),
      });
    } else {
      const existing = tradesBySymbol.get(trade.symbol) ?? [];
      existing.push(trade);
      tradesBySymbol.set(trade.symbol, existing);
    }
  }

  // Process regular trades with sell-as-buy-opposite logic
  for (const [symbol, symbolTrades] of tradesBySymbol) {
    const yesTrades = symbolTrades.filter(t => t.subtype === "YES");
    const noTrades = symbolTrades.filter(t => t.subtype === "NO");
    const yesQty = yesTrades.reduce((sum, t) => sum + getTradeQuantity(t), 0);
    const noQty = noTrades.reduce((sum, t) => sum + getTradeQuantity(t), 0);

    const isRoundTrip = yesTrades.length > 0 && noTrades.length > 0 && yesQty === noQty;
    const isMixed = yesTrades.length > 0 && noTrades.length > 0 && !isRoundTrip;

    if (isRoundTrip) {
      entries.push(...processRoundTripTrades(yesTrades, noTrades));
    } else if (isMixed) {
      entries.push(...processMixedTrades(symbolTrades));
    } else {
      entries.push(...processSingleSideTrades(symbolTrades));
    }
  }

  // Process settlements
  for (const trade of trades) {
    if (trade.tradeType === "Final Settlement") {
      entries.push(...processSettlement(trade, ctx));
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
