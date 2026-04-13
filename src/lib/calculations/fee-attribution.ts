/**
 * Fee Attribution
 *
 * Distributes fees from Section 3 (Trade Confirmation Summary) to
 * individual trades. Fees are attributed proportionally based on
 * quantity traded.
 */

import type { TradeConfirmationSummary } from "../parsing/robinhood/sections/section3";
import type { TradeEntry } from "./fifo";

// ============================================================================
// TYPES
// ============================================================================

/**
 * A trade with attributed fees
 */
export interface TradeWithFees extends TradeEntry {
  /** Commission portion of fees */
  commissionFees: number;
  /** Exchange fee portion */
  exchangeFees: number;
  /** NFA fee portion */
  nfaFees: number;
  /** Total attributed fees */
  totalFees: number;
  /** Whether fees were successfully attributed */
  feesAttributed: boolean;
}

/**
 * Result of fee attribution
 */
export interface FeeAttributionResult {
  /** Trades with fees attributed */
  trades: TradeWithFees[];
  /** Total fees attributed */
  totalFeesAttributed: number;
  /** Total fees from Section 3 summaries */
  totalFeesAvailable: number;
  /** Unattributed fees (summaries without matching trades) */
  unattributedFees: number;
  /** Symbols with fee attribution issues */
  warnings: string[];
}

// ============================================================================
// FEE ATTRIBUTION LOGIC
// ============================================================================

/**
 * Attribute fees from Section 3 summaries to individual trades
 *
 * Fees are distributed proportionally by quantity within each
 * symbol + date group. This matches how Robinhood reports fees
 * at the daily aggregate level.
 *
 * @param trades Individual trades from Section 2/4
 * @param summaries Fee summaries from Section 3
 * @returns Trades with fees attributed
 */
export function attributeFees(
  trades: TradeEntry[],
  summaries: TradeConfirmationSummary[]
): FeeAttributionResult {
  const warnings: string[] = [];
  let totalFeesAttributed = 0;
  let totalFeesAvailable = 0;

  // Calculate total fees available from summaries
  for (const summary of summaries) {
    totalFeesAvailable += summary.totalFees;
  }

  // Group trades by symbol + date + side for matching
  const tradeGroups = new Map<string, TradeEntry[]>();
  for (const trade of trades) {
    const key = `${trade.symbol}|${trade.date}|${trade.side}`;
    const existing = tradeGroups.get(key) ?? [];
    existing.push(trade);
    tradeGroups.set(key, existing);
  }

  // Group summaries by symbol + date + side
  const summaryGroups = new Map<string, TradeConfirmationSummary[]>();
  for (const summary of summaries) {
    const key = `${summary.symbol}|${summary.tradeDate}|${summary.subtype}`;
    const existing = summaryGroups.get(key) ?? [];
    existing.push(summary);
    summaryGroups.set(key, existing);
  }

  // Track which trades have fees attributed
  const tradesWithFees = new Map<TradeEntry, TradeWithFees>();

  // Initialize all trades with zero fees
  for (const trade of trades) {
    tradesWithFees.set(trade, {
      ...trade,
      commissionFees: 0,
      exchangeFees: 0,
      nfaFees: 0,
      totalFees: 0,
      feesAttributed: false,
    });
  }

  // Attribute fees from each summary group to matching trades
  for (const [key, groupSummaries] of summaryGroups) {
    const matchingTrades = tradeGroups.get(key) ?? [];

    if (matchingTrades.length === 0) {
      // Try matching without side (some summaries might combine YES/NO)
      const [symbol, date] = key.split("|");
      const yesKey = `${symbol}|${date}|YES`;
      const noKey = `${symbol}|${date}|NO`;
      const yesTrades = tradeGroups.get(yesKey) ?? [];
      const noTrades = tradeGroups.get(noKey) ?? [];
      const allTrades = [...yesTrades, ...noTrades];

      if (allTrades.length > 0) {
        // Distribute across both sides
        distributeFeesToTrades(
          allTrades,
          groupSummaries,
          tradesWithFees,
          warnings
        );
        totalFeesAttributed += groupSummaries.reduce(
          (sum, s) => sum + s.totalFees,
          0
        );
      } else {
        const totalFees = groupSummaries.reduce(
          (sum, s) => sum + s.totalFees,
          0
        );
        if (totalFees > 0.01) {
          warnings.push(
            `No trades found for fee summary: ${symbol} on ${date} ($${totalFees.toFixed(2)} unattributed)`
          );
        }
      }
      continue;
    }

    // Distribute fees to matching trades
    distributeFeesToTrades(
      matchingTrades,
      groupSummaries,
      tradesWithFees,
      warnings
    );
    totalFeesAttributed += groupSummaries.reduce(
      (sum, s) => sum + s.totalFees,
      0
    );
  }

  // Convert map to array
  const result: TradeWithFees[] = Array.from(tradesWithFees.values());

  // Calculate unattributed fees
  const unattributedFees = Math.abs(totalFeesAvailable - totalFeesAttributed);

  if (unattributedFees > 0.01 && totalFeesAvailable > 0) {
    warnings.push(
      `$${unattributedFees.toFixed(2)} in fees could not be attributed to trades`
    );
  }

  return {
    trades: result,
    totalFeesAttributed,
    totalFeesAvailable,
    unattributedFees,
    warnings,
  };
}

/**
 * Distribute fees from summaries to trades proportionally by quantity
 */
function distributeFeesToTrades(
  trades: TradeEntry[],
  summaries: TradeConfirmationSummary[],
  tradesWithFees: Map<TradeEntry, TradeWithFees>,
  warnings: string[]
): void {
  // Calculate total quantity across all matching trades
  const totalQuantity = trades.reduce((sum, t) => sum + t.quantity, 0);

  if (totalQuantity === 0) {
    warnings.push(`Zero total quantity for fee attribution group`);
    return;
  }

  // Sum fees from all summaries
  let totalCommissions = 0;
  let totalExchangeFees = 0;
  let totalNfaFees = 0;
  let totalFees = 0;

  for (const summary of summaries) {
    totalCommissions += summary.commissions;
    totalExchangeFees += summary.exchangeFees;
    totalNfaFees += summary.nfaFees;
    totalFees += summary.totalFees;
  }

  // Distribute proportionally by quantity
  for (const trade of trades) {
    const proportion = trade.quantity / totalQuantity;
    const tradeWithFees = tradesWithFees.get(trade);

    if (tradeWithFees) {
      tradeWithFees.commissionFees += totalCommissions * proportion;
      tradeWithFees.exchangeFees += totalExchangeFees * proportion;
      tradeWithFees.nfaFees += totalNfaFees * proportion;
      tradeWithFees.totalFees += totalFees * proportion;
      tradeWithFees.feesAttributed = true;

      // Also update the fees field in the base TradeEntry
      tradeWithFees.fees = tradeWithFees.totalFees;
    }
  }
}

// ============================================================================
// ATTRIBUTION VALIDATION
// ============================================================================

/**
 * Validate that attributed fees match Section 10 total
 *
 * @param attributedFees Total fees attributed to trades
 * @param section10Total Total fees from Section 10 Account Summary
 * @param tolerance Acceptable difference (default $0.01)
 */
export function validateFeeAttribution(
  attributedFees: number,
  section10Total: number,
  tolerance: number = 0.01
): {
  isValid: boolean;
  discrepancy: number;
  message: string;
} {
  const discrepancy = Math.abs(attributedFees - section10Total);
  const isValid = discrepancy <= tolerance;

  const message = isValid
    ? `Fee attribution validated: $${attributedFees.toFixed(2)} matches Section 10 total`
    : `Fee discrepancy: Attributed $${attributedFees.toFixed(2)}, Section 10 shows $${section10Total.toFixed(2)} (Δ $${discrepancy.toFixed(2)})`;

  return { isValid, discrepancy, message };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert TradeEntry to TradeWithFees with zero fees
 */
export function initializeTradeWithFees(trade: TradeEntry): TradeWithFees {
  return {
    ...trade,
    commissionFees: 0,
    exchangeFees: 0,
    nfaFees: 0,
    totalFees: 0,
    feesAttributed: false,
  };
}

/**
 * Get total fees from an array of trades with fees
 */
export function getTotalTradesFees(trades: TradeWithFees[]): number {
  return trades.reduce((sum, t) => sum + t.totalFees, 0);
}

/**
 * Get fee breakdown from trades
 */
export function getTradesFeeBreakdown(trades: TradeWithFees[]): {
  commissions: number;
  exchangeFees: number;
  nfaFees: number;
  total: number;
} {
  return {
    commissions: trades.reduce((sum, t) => sum + t.commissionFees, 0),
    exchangeFees: trades.reduce((sum, t) => sum + t.exchangeFees, 0),
    nfaFees: trades.reduce((sum, t) => sum + t.nfaFees, 0),
    total: trades.reduce((sum, t) => sum + t.totalFees, 0),
  };
}

/**
 * Get trades without attributed fees (for debugging)
 */
export function getUnattributedTrades(
  trades: TradeWithFees[]
): TradeWithFees[] {
  return trades.filter((t) => !t.feesAttributed);
}

/**
 * Calculate effective fee rate (fees / total trade value)
 */
export function calculateFeeRate(trades: TradeWithFees[]): number {
  const totalFees = getTotalTradesFees(trades);
  const totalValue = trades.reduce(
    (sum, t) => sum + t.price * t.quantity,
    0
  );

  if (totalValue === 0) return 0;
  return totalFees / totalValue;
}
