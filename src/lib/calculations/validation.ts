/**
 * P&L Validation
 *
 * Validates calculated P&L against the statement's Section 5 figures
 * (source of truth). Discrepancies within tolerance are acceptable;
 * we log them but use the statement values.
 */

import type { FifoResult } from "./fifo";

/**
 * Minimal reported position interface used by P&L validation.
 * Robinhood's PairedPosition satisfies this structurally.
 */
export interface ReportedPosition {
  symbol: string;
  expDate: string | null;
  yesRow: { grossPnl: number } | null;
  noRow: { grossPnl: number } | null;
  netPnl: number;
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tolerance for P&L validation (per position)
 */
export const PNL_TOLERANCE = 0.01; // ±$0.01

/**
 * Result of validating a single position's P&L
 */
export interface PositionValidation {
  /** Symbol */
  symbol: string;
  /** Expiration date (for identification) */
  expDate: string | null;
  /** Calculated P&L from FIFO */
  calculatedPnl: number;
  /** Reported P&L from Section 5 */
  reportedPnl: number;
  /** Absolute discrepancy */
  discrepancy: number;
  /** Whether discrepancy is within tolerance */
  isValid: boolean;
  /** Discrepancy percentage (relative to reported) */
  discrepancyPercent: number | null;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  /** Overall validation success */
  isValid: boolean;
  /** All position validations */
  positions: PositionValidation[];
  /** Positions that failed validation */
  failures: PositionValidation[];
  /** Positions that passed validation */
  passes: PositionValidation[];
  /** Positions with prior-period issue (calc=0 but reported≠0, missing opening trades) */
  priorPeriodIssues: PositionValidation[];
  /** Positions with both YES and NO trades (settlement logic can't handle these correctly) */
  bothSidedIssues: PositionValidation[];
  /** Total calculated P&L */
  totalCalculatedPnl: number;
  /** Total reported P&L from statement */
  totalReportedPnl: number;
  /** Total discrepancy */
  totalDiscrepancy: number;
  /** Discrepancy excluding prior-period and both-sided issues */
  adjustedDiscrepancy: number;
  /** Summary message */
  summary: string;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate a single position's calculated P&L against reported P&L
 */
export function validatePosition(
  symbol: string,
  expDate: string | null,
  calculatedPnl: number,
  reportedPnl: number
): PositionValidation {
  const discrepancy = Math.abs(calculatedPnl - reportedPnl);
  const isValid = discrepancy <= PNL_TOLERANCE;

  let discrepancyPercent: number | null = null;
  if (Math.abs(reportedPnl) > 0.01) {
    discrepancyPercent = (discrepancy / Math.abs(reportedPnl)) * 100;
  }

  return {
    symbol,
    expDate,
    calculatedPnl,
    reportedPnl,
    discrepancy,
    isValid,
    discrepancyPercent,
  };
}

/**
 * Validate calculated P&L against Section 5 paired positions
 *
 * @param fifoResults Map of symbol|side to FIFO result
 * @param section5Positions Paired positions from Section 5
 * @returns Complete validation result
 */
export function validatePnlAgainstSection5(
  fifoResults: Map<string, FifoResult>,
  section5Positions: ReportedPosition[]
): ValidationResult {
  const positions: PositionValidation[] = [];
  const failures: PositionValidation[] = [];
  const passes: PositionValidation[] = [];
  const priorPeriodIssues: PositionValidation[] = [];
  const bothSidedIssues: PositionValidation[] = [];

  let totalCalculatedPnl = 0;
  let totalReportedPnl = 0;

  // Group FIFO results by symbol (combining YES and NO sides)
  const fifoBySymbol = new Map<string, number>();
  for (const result of fifoResults.values()) {
    const existing = fifoBySymbol.get(result.symbol) ?? 0;
    fifoBySymbol.set(result.symbol, existing + result.totalGrossPnl);
  }

  // Validate each Section 5 position
  for (const s5Position of section5Positions) {
    const calculatedPnl = fifoBySymbol.get(s5Position.symbol) ?? 0;
    const reportedPnl = s5Position.netPnl;

    const validation = validatePosition(
      s5Position.symbol,
      s5Position.expDate,
      calculatedPnl,
      reportedPnl
    );

    positions.push(validation);
    totalCalculatedPnl += calculatedPnl;
    totalReportedPnl += reportedPnl;

    if (validation.isValid) {
      passes.push(validation);
    } else {
      // Check if this is a both-sided position (has BOTH YES and NO rows in Section 5)
      // These positions had both YES and NO trades, which may have complex matching
      const isBothSidedPosition =
        s5Position.yesRow !== null && s5Position.noRow !== null;

      // Check if this is a prior-period issue (calc=0 but reported≠0)
      // This happens when opening trades are from before the statement's look-back period
      const isPriorPeriodIssue =
        Math.abs(calculatedPnl) < 0.01 && Math.abs(reportedPnl) > 0.01;

      if (isBothSidedPosition) {
        bothSidedIssues.push(validation);
      } else if (isPriorPeriodIssue) {
        priorPeriodIssues.push(validation);
      }
      failures.push(validation);
    }

    // Remove from fifo map to track unmatched positions
    fifoBySymbol.delete(s5Position.symbol);
  }

  // Check for FIFO results that don't have matching Section 5 entries
  // These are likely still-open positions
  for (const [symbol, pnl] of fifoBySymbol) {
    if (Math.abs(pnl) > 0.01) {
      // Position has calculated P&L but no Section 5 entry
      // This could be an open position or a parsing issue
      const validation: PositionValidation = {
        symbol,
        expDate: null,
        calculatedPnl: pnl,
        reportedPnl: 0,
        discrepancy: Math.abs(pnl),
        isValid: false,
        discrepancyPercent: null,
      };
      positions.push(validation);
      failures.push(validation);
      totalCalculatedPnl += pnl;
    }
  }

  const totalDiscrepancy = Math.abs(totalCalculatedPnl - totalReportedPnl);

  // Calculate adjusted discrepancy (excluding known issue categories)
  // - Prior-period issues: trades from before statement's look-back period
  // - Both-sided issues: complex positions with both YES+NO trades that may have matching issues
  const priorPeriodDiscrepancy = priorPeriodIssues.reduce(
    (sum, v) => sum + v.discrepancy, 0
  );
  const bothSidedDiscrepancy = bothSidedIssues.reduce(
    (sum, v) => sum + v.discrepancy, 0
  );
  const adjustedDiscrepancy = totalDiscrepancy - priorPeriodDiscrepancy - bothSidedDiscrepancy;

  const isValid = failures.length === 0;

  // Generate summary
  let summary: string;
  if (isValid) {
    summary = `All ${passes.length} positions validated successfully. Total P&L: $${totalReportedPnl.toFixed(2)}`;
  } else {
    const issues: string[] = [];
    if (priorPeriodIssues.length > 0) {
      issues.push(`${priorPeriodIssues.length} prior-period`);
    }
    if (bothSidedIssues.length > 0) {
      issues.push(`${bothSidedIssues.length} both-sided`);
    }
    if (issues.length > 0) {
      summary = `${failures.length} positions have discrepancies (${issues.join(", ")} are known issues). Adjusted discrepancy: $${adjustedDiscrepancy.toFixed(2)}`;
    } else {
      summary = `${failures.length} of ${positions.length} positions have P&L discrepancies exceeding $${PNL_TOLERANCE.toFixed(2)}. Total discrepancy: $${totalDiscrepancy.toFixed(2)}`;
    }
  }

  return {
    isValid,
    positions,
    failures,
    passes,
    priorPeriodIssues,
    bothSidedIssues,
    totalCalculatedPnl,
    totalReportedPnl,
    totalDiscrepancy,
    adjustedDiscrepancy,
    summary,
  };
}

/**
 * Quick validation check - just verify totals are within tolerance
 */
export function quickValidateTotals(
  calculatedGrossPnl: number,
  reportedGrossPnl: number,
  tolerance: number = 1.0 // Allow $1 total discrepancy by default
): {
  isValid: boolean;
  discrepancy: number;
  message: string;
} {
  const discrepancy = Math.abs(calculatedGrossPnl - reportedGrossPnl);
  const isValid = discrepancy <= tolerance;

  const message = isValid
    ? `P&L totals match within tolerance: Calculated $${calculatedGrossPnl.toFixed(2)}, Reported $${reportedGrossPnl.toFixed(2)}`
    : `P&L total mismatch: Calculated $${calculatedGrossPnl.toFixed(2)}, Reported $${reportedGrossPnl.toFixed(2)} (Δ $${discrepancy.toFixed(2)})`;

  return { isValid, discrepancy, message };
}

// ============================================================================
// DISCREPANCY ANALYSIS
// ============================================================================

/**
 * Possible causes for P&L discrepancies
 */
export type DiscrepancyCause =
  | "ROUNDING" // Small rounding differences
  | "MISSING_TRADE" // Trade not captured in parsing
  | "PRIOR_PERIOD" // Trade from prior statement period
  | "FEE_ALLOCATION" // Fee attribution differences
  | "PARTIAL_SETTLEMENT" // Non-binary settlement price
  | "UNKNOWN";

/**
 * Analyze a discrepancy and suggest possible causes
 */
export function analyzeDiscrepancy(
  validation: PositionValidation
): DiscrepancyCause {
  // If within $0.05, likely rounding
  if (validation.discrepancy <= 0.05) {
    return "ROUNDING";
  }

  // If calculated is 0 but reported is not, likely missing trade
  if (Math.abs(validation.calculatedPnl) < 0.01 && Math.abs(validation.reportedPnl) > 1) {
    return "MISSING_TRADE";
  }

  // If calculated > reported, might be prior period trade double-counted
  if (validation.calculatedPnl > validation.reportedPnl) {
    return "PRIOR_PERIOD";
  }

  // If discrepancy is small relative to reported, likely fee allocation
  if (
    validation.discrepancyPercent !== null &&
    validation.discrepancyPercent < 5
  ) {
    return "FEE_ALLOCATION";
  }

  // If discrepancy is not a round number, might be partial settlement
  if (validation.discrepancy % 1 !== 0 && validation.discrepancy > 0.10) {
    return "PARTIAL_SETTLEMENT";
  }

  return "UNKNOWN";
}

/**
 * Generate a human-readable discrepancy report
 */
export function generateDiscrepancyReport(
  result: ValidationResult
): string {
  const lines: string[] = [];

  lines.push("=== P&L Validation Report ===");
  lines.push("");
  lines.push(`Total Calculated: $${result.totalCalculatedPnl.toFixed(2)}`);
  lines.push(`Total Reported:   $${result.totalReportedPnl.toFixed(2)}`);
  lines.push(`Total Discrepancy: $${result.totalDiscrepancy.toFixed(2)}`);
  lines.push("");

  if (result.isValid) {
    lines.push("✓ All positions validated successfully");
  } else {
    lines.push(`✗ ${result.failures.length} positions have discrepancies:`);
    lines.push("");

    for (const failure of result.failures) {
      const cause = analyzeDiscrepancy(failure);
      lines.push(`  ${failure.symbol}:`);
      lines.push(`    Calculated: $${failure.calculatedPnl.toFixed(2)}`);
      lines.push(`    Reported:   $${failure.reportedPnl.toFixed(2)}`);
      lines.push(`    Δ: $${failure.discrepancy.toFixed(2)}`);
      lines.push(`    Likely cause: ${cause}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ============================================================================
// RECONCILIATION HELPERS
// ============================================================================

/**
 * Create a reconciliation record for database storage
 */
export function createReconciliationRecord(
  validation: PositionValidation
): {
  symbol: string;
  gross_pnl: number;
  calculated_pnl: number;
  pnl_discrepancy: number;
} {
  return {
    symbol: validation.symbol,
    gross_pnl: validation.reportedPnl, // Use reported as source of truth
    calculated_pnl: validation.calculatedPnl,
    pnl_discrepancy: validation.reportedPnl - validation.calculatedPnl,
  };
}

/**
 * Determine if discrepancies should block import
 *
 * By default, we allow import with discrepancies (using statement values)
 * but warn the user. This function can be configured to be stricter.
 */
export function shouldBlockImport(
  result: ValidationResult,
  strictMode: boolean = false
): {
  block: boolean;
  reason: string | null;
} {
  if (result.isValid) {
    return { block: false, reason: null };
  }

  if (strictMode) {
    return {
      block: true,
      reason: `${result.failures.length} P&L discrepancies exceed tolerance`,
    };
  }

  // Check for severe discrepancies (more than 10% of total P&L)
  // Use adjustedDiscrepancy which excludes known issue categories:
  // - Prior-period: opening trades from before statement's look-back period
  // - Both-sided: positions with YES+NO trades that settlement logic can't handle
  const totalPnl = Math.abs(result.totalReportedPnl);
  if (totalPnl > 0 && result.adjustedDiscrepancy / totalPnl > 0.1) {
    const excluded = result.priorPeriodIssues.length + result.bothSidedIssues.length;
    return {
      block: true,
      reason: `Adjusted discrepancy ($${result.adjustedDiscrepancy.toFixed(2)}) exceeds 10% of P&L (excludes ${excluded} known issues)`,
    };
  }

  // Check for any individual discrepancy over $10
  const severeFailures = result.failures.filter((f) => f.discrepancy > 10);
  if (severeFailures.length > 0) {
    return {
      block: false, // Just warn, don't block
      reason: `${severeFailures.length} positions have discrepancies over $10`,
    };
  }

  return { block: false, reason: null };
}
