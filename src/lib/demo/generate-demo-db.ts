/**
 * Demo Database Generator
 *
 * Seeds the database with curated demo data for onboarding.
 * Creates statement import, trades, closed positions, and cash flows.
 */

import { transaction, query } from "../db/client";
import { generateId } from "../db/queries/statements";
import {
  DEMO_TRADES,
  DEMO_ACCOUNT_NUMBER,
  DEMO_PLATFORM,
  DEMO_IMPORT_ID,
  DEMO_STATEMENT_DATE,
  DEMO_PERIOD_START,
  DEMO_PERIOD_END,
  calculateTradePnl,
} from "./demo-data";

/**
 * Check if demo data is already loaded
 */
export async function isDemoDataLoaded(): Promise<boolean> {
  const results = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM statement_imports WHERE id = ?`,
    [DEMO_IMPORT_ID]
  );
  return (results[0]?.count ?? 0) > 0;
}

/**
 * Seed the database with demo data
 */
export async function seedDemoData(): Promise<void> {
  // Don't re-seed if already loaded
  if (await isDemoDataLoaded()) {
    console.log("[Demo] Demo data already loaded, skipping seed");
    return;
  }

  console.log("[Demo] Seeding demo data...");

  await transaction(async (db) => {
    // Calculate totals for statement import
    let totalGrossPnl = 0;
    let totalFees = 0;

    for (const trade of DEMO_TRADES) {
      const pnl = calculateTradePnl(trade);
      if (pnl !== null) totalGrossPnl += pnl;
      totalFees += trade.fees;
    }

    const netLiquidity = 1000 + totalGrossPnl - totalFees; // Starting with $1000

    // 1. Insert demo statement import
    await db.run(
      `INSERT INTO statement_imports (id, platform, account_number, statement_date,
        statement_period_start, statement_period_end, parser_version,
        net_liquidity, total_fees, ending_cash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DEMO_IMPORT_ID,
        DEMO_PLATFORM,
        DEMO_ACCOUNT_NUMBER,
        DEMO_STATEMENT_DATE,
        DEMO_PERIOD_START,
        DEMO_PERIOD_END,
        "demo-v1.0",
        netLiquidity,
        -totalFees, // Fees stored as negative
        netLiquidity,
      ]
    );

    // 2. Insert trades
    for (const trade of DEMO_TRADES) {
      await db.run(
        `INSERT INTO trades (id, import_id, platform, account_id,
          trade_date, symbol, side, quantity, price, fees, trade_type,
          category, settlement_date, settlement_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          DEMO_IMPORT_ID,
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

    // 3. Insert closed positions (group by symbol)
    const symbolGroups = new Map<string, typeof DEMO_TRADES>();
    for (const trade of DEMO_TRADES) {
      if (trade.settlementDate === null) continue;
      const existing = symbolGroups.get(trade.symbol) ?? [];
      existing.push(trade);
      symbolGroups.set(trade.symbol, existing);
    }

    for (const [symbol, trades] of symbolGroups) {
      const trade = trades[0]; // Use first trade for position data
      const grossPnl = trades.reduce((sum, t) => {
        const pnl = calculateTradePnl(t);
        return sum + (pnl ?? 0);
      }, 0);
      const fees = trades.reduce((sum, t) => sum + t.fees, 0);
      const totalQty = trades.reduce((sum, t) => sum + t.quantity, 0);

      await db.run(
        `INSERT INTO closed_positions (id, import_id, platform, symbol,
          entry_date, exit_date, entry_price, exit_price, quantity,
          gross_pnl, fees, net_pnl, calculated_pnl, pnl_discrepancy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          DEMO_IMPORT_ID,
          DEMO_PLATFORM,
          symbol,
          trade.date,
          trade.settlementDate,
          trade.price,
          trade.settlementPrice,
          totalQty,
          grossPnl,
          fees,
          grossPnl - fees,
          grossPnl,
          0, // No discrepancy in demo
        ]
      );
    }

    // 4. Insert a demo deposit cash flow
    await db.run(
      `INSERT INTO cash_flows (id, import_id, date, type, amount, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        DEMO_IMPORT_ID,
        "2024-01-01",
        "DEPOSIT",
        1000.00,
        "Initial demo deposit",
      ]
    );
  });

  console.log(`[Demo] Seeded ${DEMO_TRADES.length} demo trades`);
}

/**
 * Wipe all demo data from the database
 */
export async function wipeDemoData(): Promise<void> {
  console.log("[Demo] Wiping demo data...");

  await transaction(async (db) => {
    // Delete in dependency order (foreign keys)
    await db.run(`DELETE FROM closed_positions WHERE import_id = ?`, [DEMO_IMPORT_ID]);
    await db.run(`DELETE FROM open_positions WHERE import_id = ?`, [DEMO_IMPORT_ID]);
    await db.run(`DELETE FROM trades WHERE import_id = ?`, [DEMO_IMPORT_ID]);
    await db.run(`DELETE FROM cash_flows WHERE import_id = ?`, [DEMO_IMPORT_ID]);
    await db.run(`DELETE FROM statement_imports WHERE id = ?`, [DEMO_IMPORT_ID]);
  });

  console.log("[Demo] Demo data wiped");
}

/**
 * Check if the database has ONLY demo data (no real imports)
 */
export async function hasOnlyDemoData(): Promise<boolean> {
  const results = await query<{ total: number; demo: number }>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN id = ? THEN 1 ELSE 0 END) as demo
     FROM statement_imports`,
    [DEMO_IMPORT_ID]
  );
  const { total, demo } = results[0] ?? { total: 0, demo: 0 };
  return total > 0 && total === demo;
}
