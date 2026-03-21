/**
 * Demo Database Generator
 *
 * Seeds curated multi-month demo data for onboarding.
 */

import { query, transaction } from "../db/client";
import { generateId } from "../db/queries/statements";
import {
  calculateTradePnl,
  generatePairedTrades,
  DEMO_ACCOUNT_NUMBER,
  DEMO_IMPORT_IDS,
  DEMO_MONTHS,
  DEMO_PLATFORM,
  DEMO_TRADES,
} from "./demo-data";

interface DemoCashFlow {
  importId: string;
  date: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  description: string;
}

interface DemoOpenPosition {
  symbol: string;
  side: "YES" | "NO";
  quantity: number;
  costBasis: number;
  currentPrice: number;
}

const DEMO_CASH_FLOWS: DemoCashFlow[] = [
  {
    importId: "demo-import-aug",
    date: "2024-08-01",
    type: "DEPOSIT",
    amount: 1000.0,
    description: "Initial deposit",
  },
  {
    importId: "demo-import-sep",
    date: "2024-09-03",
    type: "DEPOSIT",
    amount: 200.0,
    description: "Monthly deposit",
  },
  {
    importId: "demo-import-oct",
    date: "2024-10-01",
    type: "DEPOSIT",
    amount: 150.0,
    description: "Monthly deposit",
  },
  {
    importId: "demo-import-nov",
    date: "2024-11-05",
    type: "WITHDRAWAL",
    amount: -100.0,
    description: "Partial withdrawal",
  },
];

const DEMO_OPEN_POSITIONS: DemoOpenPosition[] = [
  {
    symbol: "KXNFLGAME-24DEC01KCBUF-KC",
    side: "YES",
    quantity: 80,
    costBasis: 0.55,
    currentPrice: 0.62,
  },
  {
    symbol: "KXNCAAFGAME-24DEC07CFPUGA-UGA",
    side: "YES",
    quantity: 100,
    costBasis: 0.65,
    currentPrice: 0.58,
  },
  {
    symbol: "KXNFLGAME-24DEC08DALPHIG-DAL",
    side: "YES",
    quantity: 50,
    costBasis: 0.48,
    currentPrice: 0.52,
  },
];

/** Import ID used by the original single-month demo format (pre-v2) */
const LEGACY_DEMO_IMPORT_ID = "demo-import-001";

/** All demo import IDs including legacy format */
const ALL_DEMO_IDS = [LEGACY_DEMO_IMPORT_ID, ...DEMO_IMPORT_IDS];

let seedingPromise: Promise<void> | null = null;

function createInClausePlaceholders(size: number): string {
  return Array.from({ length: size }, () => "?").join(", ");
}

/**
 * Check if demo data is already loaded
 */
export async function isDemoDataLoaded(): Promise<boolean> {
  const placeholders = createInClausePlaceholders(DEMO_IMPORT_IDS.length);
  const results = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM statement_imports WHERE id IN (${placeholders})`,
    DEMO_IMPORT_IDS
  );
  return (results[0]?.count ?? 0) > 0;
}

/**
 * Seed the database with demo data
 */
export async function seedDemoData(): Promise<void> {
  if (seedingPromise) return seedingPromise;
  seedingPromise = doSeedDemoData();
  try {
    await seedingPromise;
  } finally {
    seedingPromise = null;
  }
}

async function doSeedDemoData(): Promise<void> {
  if (await isDemoDataLoaded()) {
    console.log("[Demo] Demo data already loaded, skipping seed");
    return;
  }

  console.log("[Demo] Seeding demo data...");

  await transaction(async (db) => {
    // Clean up legacy single-import demo format if present
    const legacyPlaceholders = createInClausePlaceholders(ALL_DEMO_IDS.length);
    await db.run(`DELETE FROM closed_positions WHERE import_id IN (${legacyPlaceholders})`, ALL_DEMO_IDS);
    await db.run(`DELETE FROM open_positions WHERE import_id IN (${legacyPlaceholders})`, ALL_DEMO_IDS);
    await db.run(`DELETE FROM trades WHERE import_id IN (${legacyPlaceholders})`, ALL_DEMO_IDS);
    await db.run(`DELETE FROM cash_flows WHERE import_id IN (${legacyPlaceholders})`, ALL_DEMO_IDS);
    await db.run(`DELETE FROM statement_imports WHERE id IN (${legacyPlaceholders})`, ALL_DEMO_IDS);

    let runningBalance = 0;

    for (const month of DEMO_MONTHS) {
      const monthTrades = DEMO_TRADES.filter((trade) => trade.importId === month.importId);
      const monthGrossPnl = monthTrades.reduce((sum, trade) => {
        return sum + (calculateTradePnl(trade) ?? 0);
      }, 0);
      const monthFees = monthTrades.reduce((sum, trade) => sum + trade.fees, 0);

      const monthDeposits = DEMO_CASH_FLOWS
        .filter(
          (cashFlow) =>
            cashFlow.date >= month.periodStart &&
            cashFlow.date <= month.periodEnd &&
            cashFlow.amount > 0
        )
        .reduce((sum, cashFlow) => sum + cashFlow.amount, 0);

      const monthWithdrawals = DEMO_CASH_FLOWS
        .filter(
          (cashFlow) =>
            cashFlow.date >= month.periodStart &&
            cashFlow.date <= month.periodEnd &&
            cashFlow.amount < 0
        )
        .reduce((sum, cashFlow) => sum + Math.abs(cashFlow.amount), 0);

      runningBalance += monthDeposits - monthWithdrawals + monthGrossPnl - monthFees;

      await db.run(
        `INSERT INTO statement_imports (id, platform, account_number, statement_date,
          statement_period_start, statement_period_end, parser_version,
          net_liquidity, total_fees, ending_cash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          month.importId,
          DEMO_PLATFORM,
          DEMO_ACCOUNT_NUMBER,
          month.statementDate,
          month.periodStart,
          month.periodEnd,
          "demo-v2.0",
          runningBalance,
          -monthFees,
          runningBalance,
        ]
      );
    }

    const pairedTrades = generatePairedTrades();
    for (const trade of pairedTrades) {
      await db.run(
        `INSERT INTO trades (id, import_id, platform, account_id,
          trade_date, symbol, side, quantity, price, fees, trade_type,
          category, settlement_date, settlement_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          trade.importId,
          DEMO_PLATFORM,
          DEMO_ACCOUNT_NUMBER,
          trade.date,
          trade.symbol,
          trade.side,
          trade.quantity,
          trade.price,
          trade.fees,
          trade.settlementDate ? "CLOSE" : "OPEN",
          trade.category,
          trade.settlementDate,
          trade.settlementPrice,
        ]
      );
    }

    const positionGroups = new Map<string, typeof DEMO_TRADES>();
    for (const trade of DEMO_TRADES) {
      if (trade.settlementDate === null) continue;
      const key = `${trade.importId}::${trade.symbol}`;
      const existing = positionGroups.get(key) ?? [];
      existing.push(trade);
      positionGroups.set(key, existing);
    }

    for (const trades of positionGroups.values()) {
      const firstTrade = trades[0];
      const grossPnl = trades.reduce((sum, trade) => {
        return sum + (calculateTradePnl(trade) ?? 0);
      }, 0);
      const fees = trades.reduce((sum, trade) => sum + trade.fees, 0);
      const totalQuantity = trades.reduce((sum, trade) => sum + trade.quantity, 0);

      await db.run(
        `INSERT INTO closed_positions (id, import_id, platform, symbol,
          entry_date, exit_date, entry_price, exit_price, quantity,
          gross_pnl, fees, net_pnl, calculated_pnl, pnl_discrepancy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          firstTrade.importId,
          DEMO_PLATFORM,
          firstTrade.symbol,
          firstTrade.date,
          firstTrade.settlementDate,
          firstTrade.price,
          firstTrade.settlementPrice,
          totalQuantity,
          grossPnl,
          fees,
          grossPnl - fees,
          grossPnl,
          0,
        ]
      );
    }

    for (const cashFlow of DEMO_CASH_FLOWS) {
      await db.run(
        `INSERT INTO cash_flows (id, import_id, date, type, amount, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          cashFlow.importId,
          cashFlow.date,
          cashFlow.type,
          cashFlow.amount,
          cashFlow.description,
        ]
      );
    }

    const finalMonth = DEMO_MONTHS[DEMO_MONTHS.length - 1];
    for (const openPosition of DEMO_OPEN_POSITIONS) {
      const marketValue = openPosition.quantity * openPosition.currentPrice;
      const unrealizedPnl =
        (openPosition.currentPrice - openPosition.costBasis) * openPosition.quantity;

      await db.run(
        `INSERT INTO open_positions (id, import_id, snapshot_date, symbol, side,
          quantity, cost_basis, current_price, market_value, unrealized_pnl)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          finalMonth.importId,
          finalMonth.statementDate,
          openPosition.symbol,
          openPosition.side,
          openPosition.quantity,
          openPosition.costBasis,
          openPosition.currentPrice,
          marketValue,
          unrealizedPnl,
        ]
      );

      await db.run(
        `INSERT INTO trades (id, import_id, platform, account_id,
          trade_date, symbol, side, quantity, price, fees, trade_type,
          category, settlement_date, settlement_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          finalMonth.importId,
          DEMO_PLATFORM,
          DEMO_ACCOUNT_NUMBER,
          finalMonth.periodStart,
          openPosition.symbol,
          openPosition.side,
          openPosition.quantity,
          openPosition.costBasis,
          0,
          "OPEN",
          openPosition.symbol.includes("NFL") ? "NFL" : "NCAAF",
          null,
          null,
        ]
      );
    }
  });

  console.log(`[Demo] Seeded ${DEMO_TRADES.length} demo trades across ${DEMO_MONTHS.length} months`);
}

/**
 * Wipe all demo data from the database
 */
export async function wipeDemoData(): Promise<void> {
  console.log("[Demo] Wiping demo data...");

  const placeholders = createInClausePlaceholders(ALL_DEMO_IDS.length);

  await transaction(async (db) => {
    await db.run(`DELETE FROM closed_positions WHERE import_id IN (${placeholders})`, ALL_DEMO_IDS);
    await db.run(`DELETE FROM open_positions WHERE import_id IN (${placeholders})`, ALL_DEMO_IDS);
    await db.run(`DELETE FROM trades WHERE import_id IN (${placeholders})`, ALL_DEMO_IDS);
    await db.run(`DELETE FROM cash_flows WHERE import_id IN (${placeholders})`, ALL_DEMO_IDS);
    await db.run(`DELETE FROM statement_imports WHERE id IN (${placeholders})`, ALL_DEMO_IDS);
  });

  console.log("[Demo] Demo data wiped");
}

/**
 * Check if the database has ONLY demo data (no real imports)
 */
export async function hasOnlyDemoData(): Promise<boolean> {
  const placeholders = createInClausePlaceholders(ALL_DEMO_IDS.length);
  const results = await query<{ total: number; demo: number }>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN id IN (${placeholders}) THEN 1 ELSE 0 END) as demo
     FROM statement_imports`,
    ALL_DEMO_IDS
  );
  const { total, demo } = results[0] ?? { total: 0, demo: 0 };
  return total > 0 && total === demo;
}
