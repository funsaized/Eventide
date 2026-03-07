/**
 * Demo Data - Curated Trades
 *
 * ~50 trades covering key narrative scenarios:
 * 1. Profitable NFL betting ($500+ profit over 20 trades)
 * 2. Losing streak in Economics category (-$200 over 8 trades)
 * 3. Mixed Tennis results (break-even with high volume)
 * 4. Single big win in Politics ($300 on one trade)
 * 5. Fee drag example (many small trades eating into profits)
 * 6. NCAAF college football trades
 */

export interface DemoTrade {
  date: string;
  symbol: string;
  side: "YES" | "NO";
  quantity: number;
  price: number;
  fees: number;
  category: string;
  settlementDate: string | null;
  settlementPrice: number | null;
}

export const DEMO_ACCOUNT_NUMBER = "DEMO-000000";
export const DEMO_PLATFORM = "robinhood" as const;
export const DEMO_IMPORT_ID = "demo-import-001";
export const DEMO_STATEMENT_DATE = "2024-06-30";
export const DEMO_PERIOD_START = "2024-01-01";
export const DEMO_PERIOD_END = "2024-06-30";

/**
 * Curated demo trades
 */
export const DEMO_TRADES: DemoTrade[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO 1: Profitable NFL betting ($500+ profit, 18 trades)
  // ═══════════════════════════════════════════════════════════════════════════

  // NFL Playoff win - YES on BUF, settled YES
  { date: "2024-01-06", symbol: "KXNFLGAME-24JAN06BUFKC-BUF", side: "YES", quantity: 100, price: 0.65, fees: 1.00, category: "NFL", settlementDate: "2024-01-07", settlementPrice: 1.00 },
  // NFL Playoff win - YES on SF, settled YES
  { date: "2024-01-13", symbol: "KXNFLGAME-24JAN13SFDET-SF", side: "YES", quantity: 80, price: 0.55, fees: 0.80, category: "NFL", settlementDate: "2024-01-14", settlementPrice: 1.00 },
  // NFL small win
  { date: "2024-01-20", symbol: "KXNFLGAME-24JAN20KCSF-KC", side: "YES", quantity: 50, price: 0.60, fees: 0.50, category: "NFL", settlementDate: "2024-01-21", settlementPrice: 1.00 },
  // NFL loss - YES on DAL, settled NO
  { date: "2024-01-21", symbol: "KXNFLGAME-24JAN21DALPH-DAL", side: "YES", quantity: 40, price: 0.70, fees: 0.40, category: "NFL", settlementDate: "2024-01-22", settlementPrice: 0.00 },
  // Super Bowl win
  { date: "2024-02-11", symbol: "KXSUPERBOWL-24FEB11-KC", side: "YES", quantity: 150, price: 0.52, fees: 1.50, category: "NFL", settlementDate: "2024-02-12", settlementPrice: 1.00 },
  // NFL Draft pick correct
  { date: "2024-04-25", symbol: "KXNFLDRAFT-24APR25-PICK1", side: "YES", quantity: 60, price: 0.80, fees: 0.60, category: "NFL", settlementDate: "2024-04-26", settlementPrice: 1.00 },
  // Week 1 wins
  { date: "2024-09-05", symbol: "KXNFLGAME-24SEP05KCBAL-KC", side: "YES", quantity: 100, price: 0.55, fees: 1.00, category: "NFL", settlementDate: "2024-09-06", settlementPrice: 1.00 },
  { date: "2024-09-08", symbol: "KXNFLGAME-24SEP08DALCLE-DAL", side: "YES", quantity: 75, price: 0.62, fees: 0.75, category: "NFL", settlementDate: "2024-09-09", settlementPrice: 1.00 },
  // NFL loss
  { date: "2024-09-15", symbol: "KXNFLGAME-24SEP15BUFTB-BUF", side: "YES", quantity: 80, price: 0.72, fees: 0.80, category: "NFL", settlementDate: "2024-09-16", settlementPrice: 0.00 },
  // NFL win
  { date: "2024-09-22", symbol: "KXNFLGAME-24SEP22KCATL-KC", side: "YES", quantity: 100, price: 0.58, fees: 1.00, category: "NFL", settlementDate: "2024-09-23", settlementPrice: 1.00 },
  // MNF win
  { date: "2024-09-30", symbol: "KXNFLGAME-24SEP30DALNYG-DAL", side: "NO", quantity: 60, price: 0.35, fees: 0.60, category: "NFL", settlementDate: "2024-10-01", settlementPrice: 0.00 },
  // NFL losses
  { date: "2024-10-06", symbol: "KXNFLGAME-24OCT06SFARI-SF", side: "YES", quantity: 50, price: 0.65, fees: 0.50, category: "NFL", settlementDate: "2024-10-07", settlementPrice: 0.00 },
  // NFL win
  { date: "2024-10-13", symbol: "KXNFLGAME-24OCT13KCDEN-KC", side: "YES", quantity: 120, price: 0.48, fees: 1.20, category: "NFL", settlementDate: "2024-10-14", settlementPrice: 1.00 },
  // TNF win
  { date: "2024-10-17", symbol: "KXNFLGAME-24OCT17DENWAS-DEN", side: "NO", quantity: 80, price: 0.40, fees: 0.80, category: "NFL", settlementDate: "2024-10-18", settlementPrice: 0.00 },
  // NFL close wins
  { date: "2024-10-20", symbol: "KXNFLGAME-24OCT20PHINYJ-PHI", side: "YES", quantity: 90, price: 0.68, fees: 0.90, category: "NFL", settlementDate: "2024-10-21", settlementPrice: 1.00 },
  { date: "2024-10-27", symbol: "KXNFLGAME-24OCT27DALHOU-DAL", side: "YES", quantity: 70, price: 0.55, fees: 0.70, category: "NFL", settlementDate: "2024-10-28", settlementPrice: 1.00 },
  // NFL loss
  { date: "2024-11-03", symbol: "KXNFLGAME-24NOV03KCTB-KC", side: "YES", quantity: 85, price: 0.75, fees: 0.85, category: "NFL", settlementDate: "2024-11-04", settlementPrice: 0.00 },
  // NFL big win
  { date: "2024-11-10", symbol: "KXNFLGAME-24NOV10BUFMIA-BUF", side: "YES", quantity: 100, price: 0.42, fees: 1.00, category: "NFL", settlementDate: "2024-11-11", settlementPrice: 1.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO 2: Losing Economics streak (-$200, 8 trades)
  // ═══════════════════════════════════════════════════════════════════════════

  // CPI prediction wrong
  { date: "2024-01-11", symbol: "KXCPI-24JAN-ABOVE", side: "YES", quantity: 50, price: 0.60, fees: 0.50, category: "Economics", settlementDate: "2024-01-12", settlementPrice: 0.00 },
  // Fed rate wrong
  { date: "2024-01-31", symbol: "KXFEDRATE-24JAN-CUT", side: "YES", quantity: 40, price: 0.45, fees: 0.40, category: "Economics", settlementDate: "2024-02-01", settlementPrice: 0.00 },
  // GDP prediction wrong
  { date: "2024-02-29", symbol: "KXGDP-24Q1-ABOVE3", side: "YES", quantity: 30, price: 0.55, fees: 0.30, category: "Economics", settlementDate: "2024-03-01", settlementPrice: 0.00 },
  // Jobs correct (small win)
  { date: "2024-03-08", symbol: "KXNFP-24MAR-ABOVE200K", side: "YES", quantity: 50, price: 0.70, fees: 0.50, category: "Economics", settlementDate: "2024-03-09", settlementPrice: 1.00 },
  // CPI wrong again
  { date: "2024-04-10", symbol: "KXCPI-24APR-BELOW3", side: "YES", quantity: 60, price: 0.65, fees: 0.60, category: "Economics", settlementDate: "2024-04-11", settlementPrice: 0.00 },
  // Fed hold - wrong
  { date: "2024-05-01", symbol: "KXFEDRATE-24MAY-CUT", side: "YES", quantity: 40, price: 0.30, fees: 0.40, category: "Economics", settlementDate: "2024-05-02", settlementPrice: 0.00 },
  // Retail wrong
  { date: "2024-05-15", symbol: "KXRETAILSALES-24MAY-UP", side: "YES", quantity: 35, price: 0.50, fees: 0.35, category: "Economics", settlementDate: "2024-05-16", settlementPrice: 0.00 },
  // Jobs small win
  { date: "2024-06-07", symbol: "KXNFP-24JUN-ABOVE150K", side: "YES", quantity: 45, price: 0.55, fees: 0.45, category: "Economics", settlementDate: "2024-06-08", settlementPrice: 1.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO 3: Tennis break-even with high volume (8 trades)
  // ═══════════════════════════════════════════════════════════════════════════

  // Australian Open
  { date: "2024-01-28", symbol: "KXAUSOPEN-24JAN28-SINNER", side: "YES", quantity: 200, price: 0.55, fees: 2.00, category: "Tennis", settlementDate: "2024-01-29", settlementPrice: 1.00 },
  { date: "2024-01-28", symbol: "KXAUSOPEN-24JAN28-DJOK", side: "YES", quantity: 150, price: 0.70, fees: 1.50, category: "Tennis", settlementDate: "2024-01-29", settlementPrice: 0.00 },
  // French Open
  { date: "2024-06-09", symbol: "KXFRENCHOPEN-24JUN09-ALCARAZ", side: "YES", quantity: 180, price: 0.45, fees: 1.80, category: "Tennis", settlementDate: "2024-06-10", settlementPrice: 1.00 },
  { date: "2024-06-09", symbol: "KXFRENCHOPEN-24JUN09-DJOK", side: "YES", quantity: 180, price: 0.52, fees: 1.80, category: "Tennis", settlementDate: "2024-06-10", settlementPrice: 0.00 },
  // Wimbledon
  { date: "2024-07-14", symbol: "KXWIMBLEDON-24JUL14-ALCARAZ", side: "YES", quantity: 250, price: 0.60, fees: 2.50, category: "Tennis", settlementDate: "2024-07-15", settlementPrice: 1.00 },
  { date: "2024-07-14", symbol: "KXWIMBLEDON-24JUL14-DJOK", side: "YES", quantity: 250, price: 0.38, fees: 2.50, category: "Tennis", settlementDate: "2024-07-15", settlementPrice: 0.00 },
  // US Open
  { date: "2024-09-08", symbol: "KXUSOMEN-24SEP08-SINNER", side: "YES", quantity: 200, price: 0.52, fees: 2.00, category: "Tennis", settlementDate: "2024-09-09", settlementPrice: 1.00 },
  { date: "2024-09-08", symbol: "KXUSOMEN-24SEP08-FRITZ", side: "YES", quantity: 200, price: 0.48, fees: 2.00, category: "Tennis", settlementDate: "2024-09-09", settlementPrice: 0.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO 4: Single big Politics win ($300)
  // ═══════════════════════════════════════════════════════════════════════════

  { date: "2024-03-05", symbol: "KXPRIMARY-24MAR05-TRUMP", side: "YES", quantity: 500, price: 0.40, fees: 5.00, category: "Politics", settlementDate: "2024-03-06", settlementPrice: 1.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO 5: Fee drag - many small trades (8 trades, small P&L eaten by fees)
  // ═══════════════════════════════════════════════════════════════════════════

  { date: "2024-02-05", symbol: "KXWEATHER-24FEB05-SNOW", side: "YES", quantity: 10, price: 0.50, fees: 1.00, category: "Weather", settlementDate: "2024-02-06", settlementPrice: 1.00 },
  { date: "2024-02-12", symbol: "KXWEATHER-24FEB12-COLD", side: "YES", quantity: 10, price: 0.55, fees: 1.00, category: "Weather", settlementDate: "2024-02-13", settlementPrice: 0.00 },
  { date: "2024-03-01", symbol: "KXWEATHER-24MAR01-RAIN", side: "YES", quantity: 15, price: 0.48, fees: 1.00, category: "Weather", settlementDate: "2024-03-02", settlementPrice: 1.00 },
  { date: "2024-03-15", symbol: "KXWEATHER-24MAR15-WARM", side: "YES", quantity: 10, price: 0.60, fees: 1.00, category: "Weather", settlementDate: "2024-03-16", settlementPrice: 1.00 },
  { date: "2024-04-01", symbol: "KXWEATHER-24APR01-STORM", side: "YES", quantity: 12, price: 0.52, fees: 1.00, category: "Weather", settlementDate: "2024-04-02", settlementPrice: 0.00 },
  { date: "2024-04-15", symbol: "KXWEATHER-24APR15-HEAT", side: "YES", quantity: 10, price: 0.50, fees: 1.00, category: "Weather", settlementDate: "2024-04-16", settlementPrice: 1.00 },
  { date: "2024-05-01", symbol: "KXWEATHER-24MAY01-TORNADO", side: "YES", quantity: 8, price: 0.45, fees: 1.00, category: "Weather", settlementDate: "2024-05-02", settlementPrice: 0.00 },
  { date: "2024-05-15", symbol: "KXWEATHER-24MAY15-FLOOD", side: "YES", quantity: 10, price: 0.50, fees: 1.00, category: "Weather", settlementDate: "2024-05-16", settlementPrice: 1.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO 6: NCAAF trades (college football)
  // ═══════════════════════════════════════════════════════════════════════════

  { date: "2024-09-07", symbol: "KXNCAAFGAME-24SEP07UGATENN-UGA", side: "YES", quantity: 100, price: 0.58, fees: 1.00, category: "NCAAF", settlementDate: "2024-09-08", settlementPrice: 1.00 },
  { date: "2024-09-14", symbol: "KXNCAAFGAME-24SEP14CLEMGT-CLEM", side: "YES", quantity: 80, price: 0.65, fees: 0.80, category: "NCAAF", settlementDate: "2024-09-15", settlementPrice: 0.00 },
  { date: "2024-09-21", symbol: "KXNCAAFGAME-24SEP21OSUORE-OSU", side: "YES", quantity: 120, price: 0.52, fees: 1.20, category: "NCAAF", settlementDate: "2024-09-22", settlementPrice: 1.00 },
  { date: "2024-10-05", symbol: "KXNCAAFGAME-24OCT05BAMATEX-BAMA", side: "YES", quantity: 90, price: 0.60, fees: 0.90, category: "NCAAF", settlementDate: "2024-10-06", settlementPrice: 1.00 },
];

/**
 * Calculate P&L for a demo trade
 * YES/LONG: (settlementPrice - price) * quantity
 * NO/SHORT: ((1 - settlementPrice) - price) * quantity
 */
export function calculateTradePnl(trade: DemoTrade): number | null {
  if (trade.settlementPrice === null) return null;
  if (trade.side === "YES") {
    return (trade.settlementPrice - trade.price) * trade.quantity;
  }
  return ((1 - trade.settlementPrice) - trade.price) * trade.quantity;
}

/**
 * Get demo data summary statistics
 */
export function getDemoSummary() {
  let totalGrossPnl = 0;
  let totalFees = 0;
  let wins = 0;
  let losses = 0;

  for (const trade of DEMO_TRADES) {
    const pnl = calculateTradePnl(trade);
    if (pnl !== null) {
      totalGrossPnl += pnl;
      if (pnl > 0) wins++;
      else losses++;
    }
    totalFees += trade.fees;
  }

  return {
    tradeCount: DEMO_TRADES.length,
    totalGrossPnl,
    totalFees,
    netPnl: totalGrossPnl - totalFees,
    wins,
    losses,
    winRate: wins / (wins + losses),
  };
}
