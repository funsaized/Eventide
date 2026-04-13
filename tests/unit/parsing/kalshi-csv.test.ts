/**
 * Kalshi Transactions CSV Parser Tests
 */

import { describe, it, expect } from "vitest";
import { parseKalshiTransactionsCsv } from "@/lib/parsing/kalshi/csv-parser";
import {
  createMockKalshiTransactionsCsv,
  createMockKalshiTransactionRow,
  KALSHI_TRANSACTION_HEADER,
} from "../../fixtures/kalshi-mocks";

describe("parseKalshiTransactionsCsv", () => {
  it("should parse a valid 3-row CSV correctly", () => {
    const csv = createMockKalshiTransactionsCsv();
    const result = parseKalshiTransactionsCsv(csv);

    expect(result.rowCount).toBe(3);
    expect(result.invalidRowCount).toBe(0);
    expect(result.rows).toHaveLength(3);
    expect(result.warnings).toHaveLength(0);
  });

  it("should parse all fields as correct types", () => {
    const row = createMockKalshiTransactionRow();
    const csv = createMockKalshiTransactionsCsv([row]);
    const result = parseKalshiTransactionsCsv(csv);

    expect(result.rows).toHaveLength(1);
    const parsed = result.rows[0];
    expect(typeof parsed.quantity).toBe("number");
    expect(typeof parsed.entry_price_cents).toBe("number");
    expect(typeof parsed.exit_price_cents).toBe("number");
    expect(typeof parsed.open_fees_cents).toBe("number");
    expect(typeof parsed.close_fees_cents).toBe("number");
    expect(typeof parsed.realized_pnl_without_fees_cents).toBe("number");
    expect(typeof parsed.realized_pnl_with_fees_cents).toBe("number");
    expect(typeof parsed.market_ticker).toBe("string");
    expect(typeof parsed.side).toBe("string");
    expect(typeof parsed.open_timestamp).toBe("string");
    expect(typeof parsed.close_timestamp).toBe("string");
  });

  it("should parse field values correctly", () => {
    const row = createMockKalshiTransactionRow({
      quantity: 10,
      market_ticker: "KXNFLGAME-25SEP08DALPHI-PHI",
      side: "yes",
      entry_price_cents: 65,
      exit_price_cents: 100,
      open_fees_cents: 30,
      close_fees_cents: 0,
      realized_pnl_without_fees_cents: 350,
      realized_pnl_with_fees_cents: 320,
    });
    const csv = createMockKalshiTransactionsCsv([row]);
    const result = parseKalshiTransactionsCsv(csv);

    const parsed = result.rows[0];
    expect(parsed.quantity).toBe(10);
    expect(parsed.market_ticker).toBe("KXNFLGAME-25SEP08DALPHI-PHI");
    expect(parsed.side).toBe("yes");
    expect(parsed.entry_price_cents).toBe(65);
    expect(parsed.exit_price_cents).toBe(100);
    expect(parsed.open_fees_cents).toBe(30);
    expect(parsed.close_fees_cents).toBe(0);
    expect(parsed.realized_pnl_without_fees_cents).toBe(350);
    expect(parsed.realized_pnl_with_fees_cents).toBe(320);
  });

  it("should handle empty CSV (header only)", () => {
    const csv = KALSHI_TRANSACTION_HEADER;
    const result = parseKalshiTransactionsCsv(csv);

    expect(result.rowCount).toBe(0);
    expect(result.invalidRowCount).toBe(0);
    expect(result.rows).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("should skip rows with empty market_ticker and add warning", () => {
    const validRow = createMockKalshiTransactionRow();
    const invalidRow = createMockKalshiTransactionRow({ market_ticker: "" });
    const csv = createMockKalshiTransactionsCsv([validRow, invalidRow, validRow]);
    const result = parseKalshiTransactionsCsv(csv);

    expect(result.rowCount).toBe(3);
    expect(result.invalidRowCount).toBe(1);
    expect(result.rows).toHaveLength(2);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("should throw on wrong header", () => {
    const csv = "wrong,header,columns\ntrade,10,KXTEST";
    expect(() => parseKalshiTransactionsCsv(csv)).toThrow();
  });

  it("should handle negative P&L values", () => {
    const row = createMockKalshiTransactionRow({
      realized_pnl_without_fees_cents: -999,
      realized_pnl_with_fees_cents: -1063,
    });
    const csv = createMockKalshiTransactionsCsv([row]);
    const result = parseKalshiTransactionsCsv(csv);

    expect(result.rows[0].realized_pnl_without_fees_cents).toBe(-999);
    expect(result.rows[0].realized_pnl_with_fees_cents).toBe(-1063);
  });

  it("should handle zero exit price (expired worthless)", () => {
    const row = createMockKalshiTransactionRow({ exit_price_cents: 0 });
    const csv = createMockKalshiTransactionsCsv([row]);
    const result = parseKalshiTransactionsCsv(csv);

    expect(result.rows[0].exit_price_cents).toBe(0);
  });
});
