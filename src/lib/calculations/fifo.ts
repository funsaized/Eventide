/**
 * FIFO P&L Calculation Engine
 *
 * Implements First-In-First-Out cost basis calculation for event contracts.
 * Event contracts settle at 0 or 1 (or partial values for some markets),
 * making P&L calculation relatively straightforward compared to traditional
 * securities.
 */

import type { TradeSide } from "../parsing/types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * A trade entry for FIFO matching
 */
export interface TradeEntry {
  /** Trade date (ISO format) */
  date: string;
  /** Symbol */
  symbol: string;
  /** Side (YES or NO) */
  side: TradeSide;
  /** Quantity traded */
  quantity: number;
  /** Price per contract (0-1 range) */
  price: number;
  /** Trade type: opening or closing */
  type: "OPEN" | "CLOSE" | "SETTLE";
  /** Settlement price (only for SETTLE type) */
  settlementPrice?: number;
  /** Fees associated with this trade */
  fees?: number;
}

/**
 * An open position lot in the FIFO queue
 */
export interface PositionLot {
  /** Original trade date */
  date: string;
  /** Original entry price */
  price: number;
  /** Remaining quantity in this lot */
  quantity: number;
  /** Associated fees (prorated) */
  fees: number;
}

/**
 * A closed position resulting from FIFO matching
 */
export interface ClosedLot {
  /** Symbol */
  symbol: string;
  /** Side */
  side: TradeSide;
  /** Entry date (from the original lot) */
  entryDate: string;
  /** Exit date (from the closing trade) */
  exitDate: string;
  /** Entry price */
  entryPrice: number;
  /** Exit price (trade price or settlement) */
  exitPrice: number;
  /** Quantity closed */
  quantity: number;
  /** Gross P&L for this lot */
  grossPnl: number;
  /** Fees attributed to this lot */
  fees: number;
  /** Net P&L (gross - fees) */
  netPnl: number;
}

/**
 * Result of FIFO matching for a symbol
 */
export interface FifoResult {
  /** Symbol processed */
  symbol: string;
  /** Side processed */
  side: TradeSide;
  /** All closed lots */
  closedLots: ClosedLot[];
  /** Remaining open lots */
  openLots: PositionLot[];
  /** Total gross P&L */
  totalGrossPnl: number;
  /** Total fees */
  totalFees: number;
  /** Total net P&L */
  totalNetPnl: number;
  /** Total quantity closed */
  totalQuantityClosed: number;
  /** Total quantity still open */
  totalQuantityOpen: number;
}

// ============================================================================
// POSITION LEDGER
// ============================================================================

/**
 * Position ledger that tracks open lots by symbol+side
 */
export class PositionLedger {
  /** Map of symbol+side to open lots (FIFO queue) */
  private positions: Map<string, PositionLot[]> = new Map();

  /**
   * Generate key for position lookup
   */
  private getKey(symbol: string, side: TradeSide): string {
    return `${symbol}|${side}`;
  }

  /**
   * Add an opening trade to the ledger
   */
  addOpeningTrade(trade: TradeEntry): void {
    const key = this.getKey(trade.symbol, trade.side);
    const lots = this.positions.get(key) ?? [];

    lots.push({
      date: trade.date,
      price: trade.price,
      quantity: trade.quantity,
      fees: trade.fees ?? 0,
    });

    this.positions.set(key, lots);
  }

  /**
   * Match a closing trade against open lots (FIFO)
   * Returns the closed lots created
   */
  closePosition(trade: TradeEntry): ClosedLot[] {
    const key = this.getKey(trade.symbol, trade.side);
    const lots = this.positions.get(key) ?? [];
    const closedLots: ClosedLot[] = [];

    if (lots.length === 0) {
      // No open position to close - this might be a naked short
      // For now, we'll just warn and skip
      console.warn(
        `No open position to close for ${trade.symbol} ${trade.side}`
      );
      return closedLots;
    }

    let remainingQty = trade.quantity;
    const exitPrice = trade.settlementPrice ?? trade.price;

    while (remainingQty > 0 && lots.length > 0) {
      const oldestLot = lots[0];
      const matchQty = Math.min(remainingQty, oldestLot.quantity);

      // Calculate P&L for this lot
      // For YES positions: profit if exit > entry
      // For NO positions: profit if exit < entry
      let grossPnl: number;
      if (trade.side === "YES") {
        grossPnl = matchQty * (exitPrice - oldestLot.price);
      } else {
        // NO positions: you profit when the event doesn't happen (price goes to 0)
        // If you bought NO at 0.30 and it settles at 0, you profit (1.00 - 0.30) per contract
        // This is handled the same way: exitPrice - entryPrice
        grossPnl = matchQty * (exitPrice - oldestLot.price);
      }

      // Prorate fees based on quantity
      const lotFeeRatio =
        oldestLot.quantity > 0 ? matchQty / oldestLot.quantity : 0;
      const lotFees = oldestLot.fees * lotFeeRatio;
      const closingFees = ((trade.fees ?? 0) * matchQty) / trade.quantity;
      const totalFees = lotFees + closingFees;

      closedLots.push({
        symbol: trade.symbol,
        side: trade.side,
        entryDate: oldestLot.date,
        exitDate: trade.date,
        entryPrice: oldestLot.price,
        exitPrice,
        quantity: matchQty,
        grossPnl,
        fees: totalFees,
        netPnl: grossPnl - totalFees,
      });

      // Update the lot
      oldestLot.quantity -= matchQty;
      oldestLot.fees -= lotFees;
      remainingQty -= matchQty;

      // Remove fully consumed lots
      if (oldestLot.quantity <= 0) {
        lots.shift();
      }
    }

    // Warn if we couldn't fully close
    if (remainingQty > 0) {
      console.warn(
        `Could not fully close position: ${remainingQty} contracts remaining for ${trade.symbol} ${trade.side}`
      );
    }

    // Update the ledger
    this.positions.set(key, lots);

    return closedLots;
  }

  /**
   * Get open lots for a symbol+side
   */
  getOpenLots(symbol: string, side: TradeSide): PositionLot[] {
    const key = this.getKey(symbol, side);
    return this.positions.get(key) ?? [];
  }

  /**
   * Get total open quantity for a symbol+side
   */
  getOpenQuantity(symbol: string, side: TradeSide): number {
    const lots = this.getOpenLots(symbol, side);
    return lots.reduce((sum, lot) => sum + lot.quantity, 0);
  }

  /**
   * Get all open positions
   */
  getAllOpenPositions(): Map<string, PositionLot[]> {
    return new Map(this.positions);
  }

  /**
   * Clear all positions
   */
  clear(): void {
    this.positions.clear();
  }
}

// ============================================================================
// FIFO CALCULATION
// ============================================================================

/**
 * Calculate P&L for a set of trades using FIFO matching
 *
 * @param trades All trades for a symbol+side, sorted by date
 * @returns FIFO result with closed lots and remaining open lots
 */
export function calculateFifo(trades: TradeEntry[]): FifoResult {
  if (trades.length === 0) {
    return {
      symbol: "",
      side: "YES",
      closedLots: [],
      openLots: [],
      totalGrossPnl: 0,
      totalFees: 0,
      totalNetPnl: 0,
      totalQuantityClosed: 0,
      totalQuantityOpen: 0,
    };
  }

  const symbol = trades[0].symbol;
  const side = trades[0].side;

  // Sort trades by date (FIFO requires chronological order)
  // IMPORTANT: Within the same date, process OPEN trades before CLOSE/SETTLE
  // This ensures all buys for a day are added to the ledger before any sells
  // Without this, settlements appearing before buys in the PDF would fail
  const sortedTrades = [...trades].sort((a, b) => {
    const dateCompare =
      new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;

    // Same date: OPEN comes before CLOSE/SETTLE
    const typeOrder = { OPEN: 0, CLOSE: 1, SETTLE: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });

  const ledger = new PositionLedger();
  const allClosedLots: ClosedLot[] = [];

  for (const trade of sortedTrades) {
    if (trade.type === "OPEN") {
      ledger.addOpeningTrade(trade);
    } else {
      // CLOSE or SETTLE
      const closedLots = ledger.closePosition(trade);
      allClosedLots.push(...closedLots);
    }
  }

  // Calculate totals
  const totalGrossPnl = allClosedLots.reduce(
    (sum, lot) => sum + lot.grossPnl,
    0
  );
  const totalFees = allClosedLots.reduce((sum, lot) => sum + lot.fees, 0);
  const totalNetPnl = allClosedLots.reduce((sum, lot) => sum + lot.netPnl, 0);
  const totalQuantityClosed = allClosedLots.reduce(
    (sum, lot) => sum + lot.quantity,
    0
  );

  const openLots = ledger.getOpenLots(symbol, side);
  const totalQuantityOpen = openLots.reduce((sum, lot) => sum + lot.quantity, 0);

  return {
    symbol,
    side,
    closedLots: allClosedLots,
    openLots,
    totalGrossPnl,
    totalFees,
    totalNetPnl,
    totalQuantityClosed,
    totalQuantityOpen,
  };
}

/**
 * Calculate P&L for trades grouped by symbol+side
 *
 * @param trades All trades across all symbols
 * @returns Map of symbol+side to FIFO results
 */
export function calculateAllPositions(
  trades: TradeEntry[]
): Map<string, FifoResult> {
  // Group trades by symbol+side
  const grouped = new Map<string, TradeEntry[]>();

  for (const trade of trades) {
    const key = `${trade.symbol}|${trade.side}`;
    const existing = grouped.get(key) ?? [];
    existing.push(trade);
    grouped.set(key, existing);
  }

  // Calculate FIFO for each group
  const results = new Map<string, FifoResult>();

  for (const [key, groupTrades] of grouped) {
    results.set(key, calculateFifo(groupTrades));
  }

  return results;
}

// ============================================================================
// AGGREGATION UTILITIES
// ============================================================================

/**
 * Aggregate closed lots by symbol (combining YES and NO)
 */
export function aggregateBySymbol(results: Map<string, FifoResult>): Map<
  string,
  {
    symbol: string;
    totalGrossPnl: number;
    totalNetPnl: number;
    totalFees: number;
    yesPnl: number;
    noPnl: number;
    totalQuantity: number;
  }
> {
  const bySymbol = new Map<
    string,
    {
      symbol: string;
      totalGrossPnl: number;
      totalNetPnl: number;
      totalFees: number;
      yesPnl: number;
      noPnl: number;
      totalQuantity: number;
    }
  >();

  for (const result of results.values()) {
    const existing = bySymbol.get(result.symbol) ?? {
      symbol: result.symbol,
      totalGrossPnl: 0,
      totalNetPnl: 0,
      totalFees: 0,
      yesPnl: 0,
      noPnl: 0,
      totalQuantity: 0,
    };

    existing.totalGrossPnl += result.totalGrossPnl;
    existing.totalNetPnl += result.totalNetPnl;
    existing.totalFees += result.totalFees;
    existing.totalQuantity += result.totalQuantityClosed;

    if (result.side === "YES") {
      existing.yesPnl += result.totalNetPnl;
    } else {
      existing.noPnl += result.totalNetPnl;
    }

    bySymbol.set(result.symbol, existing);
  }

  return bySymbol;
}

/**
 * Get total P&L across all positions
 */
export function getTotalPnl(results: Map<string, FifoResult>): {
  grossPnl: number;
  fees: number;
  netPnl: number;
} {
  let grossPnl = 0;
  let fees = 0;
  let netPnl = 0;

  for (const result of results.values()) {
    grossPnl += result.totalGrossPnl;
    fees += result.totalFees;
    netPnl += result.totalNetPnl;
  }

  return { grossPnl, fees, netPnl };
}

/**
 * Get winning and losing positions count
 */
export function getWinLossStats(results: Map<string, FifoResult>): {
  winningPositions: number;
  losingPositions: number;
  breakEvenPositions: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
} {
  let winningPositions = 0;
  let losingPositions = 0;
  let breakEvenPositions = 0;
  let totalProfit = 0;
  let totalLoss = 0;

  for (const result of results.values()) {
    for (const lot of result.closedLots) {
      if (lot.netPnl > 0.01) {
        winningPositions++;
        totalProfit += lot.netPnl;
      } else if (lot.netPnl < -0.01) {
        losingPositions++;
        totalLoss += Math.abs(lot.netPnl);
      } else {
        breakEvenPositions++;
      }
    }
  }

  const total = winningPositions + losingPositions + breakEvenPositions;
  const winRate = total > 0 ? winningPositions / total : 0;

  return {
    winningPositions,
    losingPositions,
    breakEvenPositions,
    winRate,
    totalProfit,
    totalLoss,
  };
}
