/**
 * Section 10 Parser: Account Summary
 *
 * Parses the Account Summary section which uses a key-value format
 * (not tabular like other sections). Extracts net liquidity, fees,
 * cash balances, and other account-level metrics.
 */

import type { TextItem, AccountSummary } from "../types";
import type { SectionBoundary } from "./boundaries";
import { SECTION10_FIELD_PATTERNS } from "./columns";
import { groupIntoRows } from "./columns";
import { parseCurrencyValue, parseDateToISO, parseLogger } from "./parse-helpers";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw account summary data with all parsed fields
 */
export interface AccountSummaryRaw {
  /** Beginning cash balance for the period */
  beginningCashBalance: number | null;
  /** Total commissions paid */
  commissions: number | null;
  /** Exchange fees paid */
  exchangeFees: number | null;
  /** NFA (National Futures Association) fees */
  nfaFees: number | null;
  /** Total of all commissions and fees */
  totalCommissionsAndFees: number | null;
  /** Gross profit and loss (before fees) */
  grossProfitAndLoss: number | null;
  /** Event contract trade costs/proceeds */
  eventContractTradeCosts: number | null;
  /** Cash activity (deposits/withdrawals) */
  cashActivity: number | null;
  /** Ending cash balance */
  endingCashBalance: number | null;
  /** Open trade equity / unrealized P&L */
  openTradeEquity: number | null;
  /** Total equity */
  totalEquity: number | null;
  /** Net liquidity (main account value) */
  netLiquidity: number | null;
  /** Event contracts open position market value */
  eventContractsMarketValue: number | null;
  /** Initial margin requirement */
  initialMargin: number | null;
  /** Margin excess or deficit */
  marginExcessDeficit: number | null;
  /** Active margin call amount */
  marginCall: number | null;
}

/**
 * Result of parsing Section 10
 */
export interface Section10ParseResult {
  /** Parsed account summary */
  summary: AccountSummaryRaw;
  /** Number of fields successfully parsed */
  fieldsFound: number;
  /** Parsing warnings */
  warnings: string[];
}

// ============================================================================
// PARSING LOGIC
// ============================================================================

/**
 * Extract the value portion from a key-value row
 *
 * In Section 10, rows typically have format: "Label     Value     OtherValue"
 * We need to find the numeric value(s) after the label.
 */
function extractRowValues(row: TextItem[]): string[] {
  // Sort by X position
  const sorted = [...row].sort((a, b) => a.x - b.x);

  // Skip items that look like labels (leftmost text)
  // Values are typically on the right side
  const values: string[] = [];

  for (const item of sorted) {
    const text = item.text.trim();

    // Skip empty or label-like text
    if (!text) continue;

    // Check if it looks like a number/currency value
    // Allow: digits, decimals, commas, parentheses (negative), $ sign, minus
    if (/^[\d$(),.\-\s]+$/.test(text) || /^\([\d$,.\s]+\)$/.test(text)) {
      values.push(text);
    }
  }

  return values;
}

/**
 * Match a row against field patterns
 */
function matchFieldPattern(
  rowText: string
): { field: string; dataType: "currency" | "text" | "date" } | null {
  for (const fieldDef of SECTION10_FIELD_PATTERNS) {
    for (const pattern of fieldDef.patterns) {
      if (pattern.test(rowText)) {
        return { field: fieldDef.field, dataType: fieldDef.dataType };
      }
    }
  }
  return null;
}

/**
 * Parse Section 10 (Account Summary)
 */
export function parseSection10(
  boundary: SectionBoundary,
  _pageWidth: number
): Section10ParseResult {
  const items = boundary.items;
  const warnings: string[] = [];

  // Initialize all fields to null
  const summary: AccountSummaryRaw = {
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

  if (items.length === 0) {
    return {
      summary,
      fieldsFound: 0,
      warnings: ["Section 10 has no items"],
    };
  }

  // Group items into rows
  const rows = groupIntoRows(items);
  let fieldsFound = 0;

  for (const row of rows) {
    // Get the full row text for pattern matching
    const rowText = row.map((item) => item.text).join(" ");

    // Try to match against known field patterns
    const match = matchFieldPattern(rowText);
    if (!match) continue;

    // Extract numeric values from the row
    const values = extractRowValues(row);
    if (values.length === 0) {
      warnings.push(`No value found for field: ${match.field}`);
      continue;
    }

    // Parse the first value (typically the SW/main column)
    // In statements, there may be multiple columns (SW, US, etc.)
    // We want the first numeric value after the label
    const parsedValue = parseCurrencyValue(values[0]);
    if (parsedValue === null) {
      warnings.push(`Could not parse value for ${match.field}: ${values[0]}`);
      continue;
    }

    // Set the field value
    (summary as unknown as Record<string, number | null>)[match.field] = parsedValue;
    fieldsFound++;
  }

  parseLogger.result("S10", {
    rowsProcessed: rows.length,
    validCount: fieldsFound,
    warnings: warnings.length > 0 ? warnings : undefined,
  });

  return {
    summary,
    fieldsFound,
    warnings,
  };
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert AccountSummaryRaw to AccountSummary for the statement
 */
export function toAccountSummary(
  raw: AccountSummaryRaw,
  statementDate: string,
  periodStart: string,
  periodEnd: string,
  accountNumber: string
): AccountSummary {
  return {
    netLiquidity: raw.netLiquidity ?? 0,
    endingCash: raw.endingCashBalance ?? 0,
    totalFees: raw.totalCommissionsAndFees ?? 0,
    statementDate,
    periodStart,
    periodEnd,
    accountNumber,
  };
}

/**
 * Extract statement metadata from Section 1 (header) items
 *
 * This parses account number, statement date, and period from
 * the header section of the statement.
 */
export function extractStatementMetadata(
  headerItems: TextItem[]
): {
  accountNumber: string | null;
  statementDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
} {
  let accountNumber: string | null = null;
  let statementDate: string | null = null;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  const fullText = headerItems.map((item) => item.text).join(" ");

  // Look for account number pattern
  // Format: "Account Number: XXXXX" or "Account: XXXXX" or just a 5-8 digit number
  const accountMatch = fullText.match(
    /Account\s*(?:Number)?[:\s]*([A-Z0-9]{5,10})/i
  );
  if (accountMatch) {
    accountNumber = accountMatch[1];
  }

  // Look for statement date pattern
  // Format: "Statement Date: MM/DD/YYYY" or "As of MM/DD/YYYY"
  const dateMatch = fullText.match(
    /(?:Statement\s*Date|As\s*of)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i
  );
  if (dateMatch) {
    statementDate = parseDateToISO(dateMatch[1]);
  }

  // Look for statement period pattern
  // Format: "Statement Period: MM/DD/YYYY - MM/DD/YYYY"
  const periodMatch = fullText.match(
    /(?:Statement\s*Period|Period)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–to]\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
  );
  if (periodMatch) {
    periodStart = parseDateToISO(periodMatch[1]);
    periodEnd = parseDateToISO(periodMatch[2]);
  }

  // If no period found, try to find individual dates
  if (!periodStart || !periodEnd) {
    // Look for "From" and "To" or "Beginning" and "Ending"
    const fromMatch = fullText.match(
      /(?:From|Beginning)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i
    );
    const toMatch = fullText.match(
      /(?:To|Ending)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i
    );

    if (fromMatch) periodStart = parseDateToISO(fromMatch[1]);
    if (toMatch) periodEnd = parseDateToISO(toMatch[1]);
  }

  return {
    accountNumber,
    statementDate,
    periodStart,
    periodEnd,
  };
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Check if account summary has all required fields
 */
export function hasRequiredFields(summary: AccountSummaryRaw): boolean {
  // Net liquidity is the most critical field
  if (summary.netLiquidity === null) return false;

  // Should have either ending cash or total equity
  if (
    summary.endingCashBalance === null &&
    summary.totalEquity === null
  ) {
    return false;
  }

  return true;
}

/**
 * Validate that summary values are internally consistent
 */
export function validateSummaryConsistency(
  summary: AccountSummaryRaw
): string[] {
  const errors: string[] = [];

  // Check: Beginning Cash + Cash Activity ≈ Ending Cash
  if (
    summary.beginningCashBalance !== null &&
    summary.cashActivity !== null &&
    summary.endingCashBalance !== null
  ) {
    const expectedEnding =
      summary.beginningCashBalance + summary.cashActivity;
    const diff = Math.abs(expectedEnding - summary.endingCashBalance);
    // Allow for P&L impact on cash
    if (
      diff > 1 &&
      summary.grossProfitAndLoss !== null &&
      Math.abs(diff - Math.abs(summary.grossProfitAndLoss)) > 1
    ) {
      errors.push(
        `Cash balance inconsistency: Beginning (${summary.beginningCashBalance}) + Activity (${summary.cashActivity}) ≠ Ending (${summary.endingCashBalance})`
      );
    }
  }

  // Check: Total Fees = Commissions + Exchange Fees + NFA Fees
  if (
    summary.totalCommissionsAndFees !== null &&
    summary.commissions !== null
  ) {
    const calculatedTotal =
      (summary.commissions ?? 0) +
      (summary.exchangeFees ?? 0) +
      (summary.nfaFees ?? 0);
    const diff = Math.abs(calculatedTotal - summary.totalCommissionsAndFees);
    if (diff > 0.01) {
      errors.push(
        `Fee total inconsistency: Calculated ${calculatedTotal} ≠ Reported ${summary.totalCommissionsAndFees}`
      );
    }
  }

  // Check: Net Liquidity should equal Total Equity for event contract accounts
  if (
    summary.netLiquidity !== null &&
    summary.totalEquity !== null
  ) {
    const diff = Math.abs(summary.netLiquidity - summary.totalEquity);
    if (diff > 1) {
      // This is sometimes expected due to margin requirements
      // Just log as informational
      errors.push(
        `Net Liquidity (${summary.netLiquidity}) differs from Total Equity (${summary.totalEquity})`
      );
    }
  }

  return errors;
}

/**
 * Get total fees from summary
 */
export function getTotalFees(summary: AccountSummaryRaw): number {
  if (summary.totalCommissionsAndFees !== null) {
    return summary.totalCommissionsAndFees;
  }

  // Calculate from components
  return (
    (summary.commissions ?? 0) +
    (summary.exchangeFees ?? 0) +
    (summary.nfaFees ?? 0)
  );
}

/**
 * Get net P&L (gross P&L minus fees)
 */
export function getNetPnl(summary: AccountSummaryRaw): number | null {
  if (summary.grossProfitAndLoss === null) return null;
  const fees = getTotalFees(summary);
  return summary.grossProfitAndLoss - fees;
}
