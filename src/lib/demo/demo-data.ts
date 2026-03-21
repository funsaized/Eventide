/**
 * Demo Data - Curated Monthly Story (Aug-Nov 2024)
 *
 * Narrative arc:
 * - Aug: strong start (NFL + tennis qualifiers)
 * - Sep: best trading month (NFL season open + mixed NCAAF)
 * - Oct: pullback (NFL volatility + macro misses)
 * - Nov: recovery (large politics win + steadier NFL)
 */

export interface DemoMonth {
  importId: string;
  statementDate: string;
  periodStart: string;
  periodEnd: string;
}

export interface DemoTrade {
  importId: string;
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

export const DEMO_MONTHS: DemoMonth[] = [
  {
    importId: "demo-import-aug",
    statementDate: "2024-08-31",
    periodStart: "2024-08-01",
    periodEnd: "2024-08-31",
  },
  {
    importId: "demo-import-sep",
    statementDate: "2024-09-30",
    periodStart: "2024-09-01",
    periodEnd: "2024-09-30",
  },
  {
    importId: "demo-import-oct",
    statementDate: "2024-10-31",
    periodStart: "2024-10-01",
    periodEnd: "2024-10-31",
  },
  {
    importId: "demo-import-nov",
    statementDate: "2024-11-30",
    periodStart: "2024-11-01",
    periodEnd: "2024-11-30",
  },
];

export const DEMO_IMPORT_IDS = DEMO_MONTHS.map((month) => month.importId);

export const DEMO_IMPORT_ID = DEMO_MONTHS[0].importId;

export const DEMO_STATEMENT_DATE = DEMO_MONTHS[0].statementDate;
export const DEMO_PERIOD_START = DEMO_MONTHS[0].periodStart;
export const DEMO_PERIOD_END = DEMO_MONTHS[0].periodEnd;

export const DEMO_TRADES: DemoTrade[] = [
  // ============================================================================
  // AUG 2024 (demo-import-aug) - Strong start
  // ============================================================================
  { importId: "demo-import-aug", date: "2024-08-03", symbol: "KXNFLGAME-24AUG03KCBAL-KC", side: "YES", quantity: 120, price: 0.57, fees: 1.2, category: "NFL", settlementDate: "2024-08-04", settlementPrice: 1.0 },
  { importId: "demo-import-aug", date: "2024-08-05", symbol: "KXNFP-24AUG-ABOVE175K", side: "YES", quantity: 50, price: 0.55, fees: 0.5, category: "Economics", settlementDate: "2024-08-06", settlementPrice: 0.0 },
  { importId: "demo-import-aug", date: "2024-08-08", symbol: "KXNFLGAME-24AUG08BUFLAR-BUF", side: "NO", quantity: 90, price: 0.41, fees: 0.9, category: "NFL", settlementDate: "2024-08-09", settlementPrice: 0.0 },
  { importId: "demo-import-aug", date: "2024-08-09", symbol: "KXWEATHER-24AUG09HEAT-NY", side: "YES", quantity: 20, price: 0.47, fees: 0.95, category: "Weather", settlementDate: "2024-08-10", settlementPrice: 1.0 },
  { importId: "demo-import-aug", date: "2024-08-12", symbol: "KXNFLGAME-24AUG12DALCLE-DAL", side: "YES", quantity: 80, price: 0.63, fees: 0.8, category: "NFL", settlementDate: "2024-08-13", settlementPrice: 1.0 },
  { importId: "demo-import-aug", date: "2024-08-14", symbol: "KXCPI-24AUG-ABOVE32", side: "YES", quantity: 70, price: 0.66, fees: 0.7, category: "Economics", settlementDate: "2024-08-15", settlementPrice: 0.0 },
  { importId: "demo-import-aug", date: "2024-08-18", symbol: "KXNFLGAME-24AUG18SFSEA-SF", side: "YES", quantity: 100, price: 0.54, fees: 1.0, category: "NFL", settlementDate: "2024-08-19", settlementPrice: 1.0 },
  { importId: "demo-import-aug", date: "2024-08-20", symbol: "KXUSOPENQ-24AUG20-SINNER", side: "YES", quantity: 180, price: 0.62, fees: 1.8, category: "Tennis", settlementDate: "2024-08-21", settlementPrice: 1.0 },
  { importId: "demo-import-aug", date: "2024-08-21", symbol: "KXUSOPENQ-24AUG21-MEDVEDEV", side: "YES", quantity: 150, price: 0.58, fees: 1.5, category: "Tennis", settlementDate: "2024-08-22", settlementPrice: 0.0 },
  { importId: "demo-import-aug", date: "2024-08-22", symbol: "KXNFLGAME-24AUG22PHIGB-PHI", side: "YES", quantity: 70, price: 0.59, fees: 0.7, category: "NFL", settlementDate: "2024-08-23", settlementPrice: 1.0 },
  { importId: "demo-import-aug", date: "2024-08-24", symbol: "KXWEATHER-24AUG24RAIN-BOS", side: "NO", quantity: 18, price: 0.44, fees: 0.95, category: "Weather", settlementDate: "2024-08-25", settlementPrice: 0.0 },
  { importId: "demo-import-aug", date: "2024-08-26", symbol: "KXNFLGAME-24AUG26MIAJAX-MIA", side: "NO", quantity: 60, price: 0.36, fees: 0.6, category: "NFL", settlementDate: "2024-08-27", settlementPrice: 1.0 },
  { importId: "demo-import-aug", date: "2024-08-27", symbol: "KXWEATHER-24AUG27STORM-CHI", side: "YES", quantity: 15, price: 0.52, fees: 0.9, category: "Weather", settlementDate: "2024-08-28", settlementPrice: 0.0 },
  { importId: "demo-import-aug", date: "2024-08-28", symbol: "KXFEDRATE-24SEP-CUT", side: "NO", quantity: 60, price: 0.38, fees: 0.6, category: "Economics", settlementDate: "2024-08-29", settlementPrice: 1.0 },
  { importId: "demo-import-aug", date: "2024-08-30", symbol: "KXNFLGAME-24AUG30KCCIN-KC", side: "YES", quantity: 110, price: 0.52, fees: 1.1, category: "NFL", settlementDate: "2024-08-31", settlementPrice: 1.0 },
  { importId: "demo-import-aug", date: "2024-08-31", symbol: "KXNFLPRE-24AUG31NYJNE-NE", side: "NO", quantity: 75, price: 0.46, fees: 0.75, category: "NFL", settlementDate: "2024-09-01", settlementPrice: 0.0 },

  // ============================================================================
  // SEP 2024 (demo-import-sep) - Best month
  // ============================================================================
  { importId: "demo-import-sep", date: "2024-09-03", symbol: "KXNFLGAME-24SEP03KCBAL-KC", side: "YES", quantity: 140, price: 0.56, fees: 1.4, category: "NFL", settlementDate: "2024-09-04", settlementPrice: 0.0 },
  { importId: "demo-import-sep", date: "2024-09-05", symbol: "KXCPI-24SEP-BELOW30", side: "YES", quantity: 70, price: 0.61, fees: 0.7, category: "Economics", settlementDate: "2024-09-06", settlementPrice: 1.0 },
  { importId: "demo-import-sep", date: "2024-09-06", symbol: "KXNFLGAME-24SEP06DALCLE-DAL", side: "YES", quantity: 95, price: 0.62, fees: 0.95, category: "NFL", settlementDate: "2024-09-07", settlementPrice: 0.0 },
  { importId: "demo-import-sep", date: "2024-09-07", symbol: "KXNCAAFGAME-24SEP07UGATENN-UGA", side: "YES", quantity: 100, price: 0.58, fees: 1.0, category: "NCAAF", settlementDate: "2024-09-08", settlementPrice: 1.0 },
  { importId: "demo-import-sep", date: "2024-09-08", symbol: "KXUSOPEN-24SEP08-SINNER", side: "YES", quantity: 200, price: 0.52, fees: 2.0, category: "Tennis", settlementDate: "2024-09-09", settlementPrice: 1.0 },
  { importId: "demo-import-sep", date: "2024-09-08", symbol: "KXUSOPEN-24SEP08-FRITZ", side: "YES", quantity: 200, price: 0.48, fees: 2.0, category: "Tennis", settlementDate: "2024-09-09", settlementPrice: 0.0 },
  { importId: "demo-import-sep", date: "2024-09-10", symbol: "KXNFLGAME-24SEP10SFPHI-SF", side: "YES", quantity: 110, price: 0.53, fees: 1.1, category: "NFL", settlementDate: "2024-09-11", settlementPrice: 1.0 },
  { importId: "demo-import-sep", date: "2024-09-12", symbol: "KXFEDRATE-24SEP-HOLD", side: "YES", quantity: 75, price: 0.64, fees: 0.75, category: "Economics", settlementDate: "2024-09-13", settlementPrice: 0.0 },
  { importId: "demo-import-sep", date: "2024-09-14", symbol: "KXNCAAFGAME-24SEP14CLEMGT-CLEM", side: "YES", quantity: 90, price: 0.65, fees: 0.9, category: "NCAAF", settlementDate: "2024-09-15", settlementPrice: 0.0 },
  { importId: "demo-import-sep", date: "2024-09-15", symbol: "KXNFLGAME-24SEP15BUFTB-BUF", side: "YES", quantity: 100, price: 0.72, fees: 1.0, category: "NFL", settlementDate: "2024-09-16", settlementPrice: 0.0 },
  { importId: "demo-import-sep", date: "2024-09-18", symbol: "KXNFLGAME-24SEP18KCATL-KC", side: "YES", quantity: 120, price: 0.57, fees: 1.2, category: "NFL", settlementDate: "2024-09-19", settlementPrice: 1.0 },
  { importId: "demo-import-sep", date: "2024-09-20", symbol: "KXWEATHER-24SEP20WIND-DEN", side: "YES", quantity: 14, price: 0.49, fees: 0.9, category: "Weather", settlementDate: "2024-09-21", settlementPrice: 0.0 },
  { importId: "demo-import-sep", date: "2024-09-21", symbol: "KXNCAAFGAME-24SEP21OSUORE-OSU", side: "YES", quantity: 130, price: 0.52, fees: 1.3, category: "NCAAF", settlementDate: "2024-09-22", settlementPrice: 1.0 },
  { importId: "demo-import-sep", date: "2024-09-24", symbol: "KXNFLGAME-24SEP24DALNYG-DAL", side: "NO", quantity: 90, price: 0.37, fees: 0.9, category: "NFL", settlementDate: "2024-09-25", settlementPrice: 0.0 },
  { importId: "demo-import-sep", date: "2024-09-27", symbol: "KXNFLGAME-24SEP27MIABUF-BUF", side: "YES", quantity: 100, price: 0.51, fees: 1.0, category: "NFL", settlementDate: "2024-09-28", settlementPrice: 1.0 },
  { importId: "demo-import-sep", date: "2024-09-30", symbol: "KXNFLGAME-24SEP30SEASF-SEA", side: "NO", quantity: 85, price: 0.42, fees: 0.85, category: "NFL", settlementDate: "2024-10-01", settlementPrice: 1.0 },

  // ============================================================================
  // OCT 2024 (demo-import-oct) - Pullback
  // ============================================================================
  { importId: "demo-import-oct", date: "2024-10-01", symbol: "KXNFLGAME-24OCT01KCNO-KC", side: "YES", quantity: 140, price: 0.74, fees: 1.4, category: "NFL", settlementDate: "2024-10-02", settlementPrice: 0.0 },
  { importId: "demo-import-oct", date: "2024-10-02", symbol: "KXCPI-24OCT-BELOW29", side: "YES", quantity: 90, price: 0.68, fees: 0.9, category: "Economics", settlementDate: "2024-10-03", settlementPrice: 0.0 },
  { importId: "demo-import-oct", date: "2024-10-04", symbol: "KXNFLGAME-24OCT04DALPIT-DAL", side: "YES", quantity: 110, price: 0.61, fees: 1.1, category: "NFL", settlementDate: "2024-10-05", settlementPrice: 0.0 },
  { importId: "demo-import-oct", date: "2024-10-05", symbol: "KXNCAAFGAME-24OCT05BAMATEX-BAMA", side: "YES", quantity: 100, price: 0.59, fees: 1.0, category: "NCAAF", settlementDate: "2024-10-06", settlementPrice: 1.0 },
  { importId: "demo-import-oct", date: "2024-10-07", symbol: "KXNFLGAME-24OCT07MIAJAX-MIA", side: "NO", quantity: 100, price: 0.38, fees: 1.0, category: "NFL", settlementDate: "2024-10-08", settlementPrice: 1.0 },
  { importId: "demo-import-oct", date: "2024-10-09", symbol: "KXPOLLSENATE-24OCT09-AZDEM", side: "YES", quantity: 180, price: 0.62, fees: 1.8, category: "Politics", settlementDate: "2024-10-10", settlementPrice: 0.0 },
  { importId: "demo-import-oct", date: "2024-10-10", symbol: "KXWEATHER-24OCT10FROST-MSP", side: "YES", quantity: 12, price: 0.55, fees: 0.9, category: "Weather", settlementDate: "2024-10-11", settlementPrice: 0.0 },
  { importId: "demo-import-oct", date: "2024-10-12", symbol: "KXNFLGAME-24OCT12BUFNYJ-BUF", side: "YES", quantity: 120, price: 0.64, fees: 1.2, category: "NFL", settlementDate: "2024-10-13", settlementPrice: 1.0 },
  { importId: "demo-import-oct", date: "2024-10-14", symbol: "KXNCAAFGAME-24OCT14MIICHI-MICH", side: "YES", quantity: 110, price: 0.57, fees: 1.1, category: "NCAAF", settlementDate: "2024-10-15", settlementPrice: 1.0 },
  { importId: "demo-import-oct", date: "2024-10-16", symbol: "KXNFLGAME-24OCT16PHIATL-PHI", side: "YES", quantity: 105, price: 0.67, fees: 1.05, category: "NFL", settlementDate: "2024-10-17", settlementPrice: 0.0 },
  { importId: "demo-import-oct", date: "2024-10-18", symbol: "KXNFP-24OCT-ABOVE250K", side: "YES", quantity: 75, price: 0.63, fees: 0.75, category: "Economics", settlementDate: "2024-10-19", settlementPrice: 0.0 },
  { importId: "demo-import-oct", date: "2024-10-19", symbol: "KXNFLGAME-24OCT19KCNE-KC", side: "YES", quantity: 120, price: 0.55, fees: 1.2, category: "NFL", settlementDate: "2024-10-20", settlementPrice: 1.0 },
  { importId: "demo-import-oct", date: "2024-10-22", symbol: "KXWEATHER-24OCT22RAIN-SEA", side: "NO", quantity: 16, price: 0.43, fees: 0.9, category: "Weather", settlementDate: "2024-10-23", settlementPrice: 1.0 },
  { importId: "demo-import-oct", date: "2024-10-25", symbol: "KXNCAAFGAME-24OCT25LSUALA-ALA", side: "NO", quantity: 100, price: 0.45, fees: 1.0, category: "NCAAF", settlementDate: "2024-10-26", settlementPrice: 0.0 },
  { importId: "demo-import-oct", date: "2024-10-29", symbol: "KXNFLGAME-24OCT29DALPHI-PHI", side: "NO", quantity: 95, price: 0.41, fees: 0.95, category: "NFL", settlementDate: "2024-10-30", settlementPrice: 1.0 },

  // ============================================================================
  // NOV 2024 (demo-import-nov) - Recovery
  // ============================================================================
  { importId: "demo-import-nov", date: "2024-11-02", symbol: "KXNFLGAME-24NOV02KCDEN-KC", side: "YES", quantity: 140, price: 0.49, fees: 1.4, category: "NFL", settlementDate: "2024-11-03", settlementPrice: 1.0 },
  { importId: "demo-import-nov", date: "2024-11-03", symbol: "KXNCAAFGAME-24NOV03UGAFLA-UGA", side: "YES", quantity: 110, price: 0.61, fees: 1.1, category: "NCAAF", settlementDate: "2024-11-04", settlementPrice: 1.0 },
  { importId: "demo-import-nov", date: "2024-11-04", symbol: "KXCPI-24NOV-BELOW28", side: "YES", quantity: 90, price: 0.59, fees: 0.9, category: "Economics", settlementDate: "2024-11-05", settlementPrice: 0.0 },
  { importId: "demo-import-nov", date: "2024-11-05", symbol: "KXNFLGAME-24NOV05BUFNYJ-BUF", side: "NO", quantity: 120, price: 0.36, fees: 1.2, category: "NFL", settlementDate: "2024-11-06", settlementPrice: 0.0 },
  { importId: "demo-import-nov", date: "2024-11-06", symbol: "KXWEATHER-24NOV06SNOW-DEN", side: "YES", quantity: 15, price: 0.53, fees: 0.95, category: "Weather", settlementDate: "2024-11-07", settlementPrice: 0.0 },
  { importId: "demo-import-nov", date: "2024-11-08", symbol: "KXNFLGAME-24NOV08PHIDAL-PHI", side: "YES", quantity: 120, price: 0.58, fees: 1.2, category: "NFL", settlementDate: "2024-11-09", settlementPrice: 1.0 },
  { importId: "demo-import-nov", date: "2024-11-10", symbol: "KXNFLGAME-24NOV10MIAKC-KC", side: "YES", quantity: 130, price: 0.44, fees: 1.3, category: "NFL", settlementDate: "2024-11-11", settlementPrice: 0.0 },
  { importId: "demo-import-nov", date: "2024-11-12", symbol: "KXPRES-24NOV12-DEMWINPV", side: "YES", quantity: 900, price: 0.61, fees: 9.0, category: "Politics", settlementDate: "2024-11-13", settlementPrice: 1.0 },
  { importId: "demo-import-nov", date: "2024-11-13", symbol: "KXNFP-24NOV-ABOVE220K", side: "NO", quantity: 80, price: 0.46, fees: 0.8, category: "Economics", settlementDate: "2024-11-14", settlementPrice: 1.0 },
  { importId: "demo-import-nov", date: "2024-11-15", symbol: "KXNCAAFGAME-24NOV15OSUMICH-OSU", side: "YES", quantity: 100, price: 0.66, fees: 1.0, category: "NCAAF", settlementDate: "2024-11-16", settlementPrice: 0.0 },
  { importId: "demo-import-nov", date: "2024-11-18", symbol: "KXNFLGAME-24NOV18SFSEA-SF", side: "NO", quantity: 95, price: 0.39, fees: 0.95, category: "NFL", settlementDate: "2024-11-19", settlementPrice: 1.0 },
  { importId: "demo-import-nov", date: "2024-11-20", symbol: "KXNCAAFGAME-24NOV20TEXAM-TEX", side: "YES", quantity: 110, price: 0.56, fees: 1.1, category: "NCAAF", settlementDate: "2024-11-21", settlementPrice: 1.0 },
  { importId: "demo-import-nov", date: "2024-11-22", symbol: "KXWEATHER-24NOV22WIND-CHI", side: "NO", quantity: 18, price: 0.42, fees: 0.95, category: "Weather", settlementDate: "2024-11-23", settlementPrice: 1.0 },
  { importId: "demo-import-nov", date: "2024-11-25", symbol: "KXNFLGAME-24NOV25DALWAS-DAL", side: "YES", quantity: 130, price: 0.51, fees: 1.3, category: "NFL", settlementDate: "2024-11-26", settlementPrice: 0.0 },
  { importId: "demo-import-nov", date: "2024-11-29", symbol: "KXNFLGAME-24NOV29KCGB-KC", side: "YES", quantity: 140, price: 0.54, fees: 1.4, category: "NFL", settlementDate: "2024-11-30", settlementPrice: 1.0 },
];

/**
 * Expand single-entry positions into paired open/settlement trades.
 * Each DEMO_TRADES entry becomes:
 *   1. Opening leg: same side as the bet, no settlement (status = Open)
 *   2. Settlement leg: opposite side, with settlement (status = Closed)
 *
 * Mirrors how Robinhood reports trades: closing a YES position shows as buying NO,
 * and closing a NO position shows as buying YES.
 */
export function generatePairedTrades(): DemoTrade[] {
  const paired: DemoTrade[] = [];

  for (const position of DEMO_TRADES) {
    if (position.settlementDate === null) {
      paired.push(position);
      continue;
    }

    const oppositeSide: "YES" | "NO" = position.side === "YES" ? "NO" : "YES";

    // 1. Opening leg — the user's original bet, no settlement
    paired.push({
      ...position,
      fees: 0,
      settlementDate: null,
      settlementPrice: null,
    });

    // 2. Settlement leg — opposite side, settlement price flipped for the other side
    //    YES win (sp=1.00) → NO settlement at sp=0.00 (NO expired worthless)
    //    YES loss (sp=0.00) → NO settlement at sp=1.00 (NO won)
    const oppositeSettlement = position.settlementPrice === 1.0 ? 0.0 : 1.0;
    paired.push({
      importId: position.importId,
      date: position.settlementDate,
      symbol: position.symbol,
      side: oppositeSide,
      quantity: position.quantity,
      price: Math.round((1 - position.price) * 10000) / 10000,
      fees: position.fees,
      category: position.category,
      settlementDate: position.settlementDate,
      settlementPrice: oppositeSettlement,
    });
  }

  return paired;
}

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
