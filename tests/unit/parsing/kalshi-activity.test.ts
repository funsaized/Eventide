/**
 * Kalshi Activity CSV Parser Tests
 */

import { describe, expect, it } from "vitest";

import { parseKalshiActivityCsv } from "@/lib/parsing/kalshi/csv-parser";
import { activityToCashFlows } from "@/lib/parsing/kalshi/transform";

import {
  createMockKalshiActivityCsv,
  createMockKalshiCreditRow,
  createMockKalshiDepositRow,
  KALSHI_ACTIVITY_HEADER,
} from "../../fixtures/kalshi-mocks";

describe("parseKalshiActivityCsv", () => {
  it("should filter to deposits and credits only, excluding orders", () => {
    const csv = createMockKalshiActivityCsv();
    const result = parseKalshiActivityCsv(csv);

    expect(result.deposits).toHaveLength(2);
    expect(result.credits).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });

  it("should strip BOM from the beginning of the file", () => {
    const csv = createMockKalshiActivityCsv([createMockKalshiDepositRow()]);

    expect(csv.startsWith("\uFEFF")).toBe(true);

    const result = parseKalshiActivityCsv(csv);

    expect(result.deposits).toHaveLength(1);
    expect(result.deposits[0].type).toBe("Deposit");
  });

  it("should handle empty Activity CSV (header only)", () => {
    const csv = KALSHI_ACTIVITY_HEADER;
    const result = parseKalshiActivityCsv(csv);

    expect(result.deposits).toHaveLength(0);
    expect(result.credits).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("should parse deposit fields correctly", () => {
    const deposit = createMockKalshiDepositRow({
      Amount_In_Dollars: "100",
      Original_Date: "2026-04-06T10:24:46.311Z",
      Deposit_Type: "ach",
      Fee_In_Dollars: "0",
    });
    const csv = createMockKalshiActivityCsv([deposit]);
    const result = parseKalshiActivityCsv(csv);

    expect(result.deposits).toHaveLength(1);
    expect(result.deposits[0].Amount_In_Dollars).toBe("100");
    expect(result.deposits[0].Deposit_Type).toBe("ach");
    expect(result.deposits[0].Fee_In_Dollars).toBe("0");
  });

  it("should parse credit fields correctly", () => {
    const credit = createMockKalshiCreditRow({
      Amount_In_Dollars: "5",
      Credit_Reason: "Big Game Deposit Delay Credit",
    });
    const csv = createMockKalshiActivityCsv([credit]);
    const result = parseKalshiActivityCsv(csv);

    expect(result.credits).toHaveLength(1);
    expect(result.credits[0].Amount_In_Dollars).toBe("5");
    expect(result.credits[0].Credit_Reason).toBe(
      "Big Game Deposit Delay Credit",
    );
  });
});

describe("activityToCashFlows", () => {
  it("should map deposits to DEPOSIT cash flows", () => {
    const parsed = {
      deposits: [
        createMockKalshiDepositRow({
          Amount_In_Dollars: "100",
          Original_Date: "2026-04-06T10:24:46.311Z",
          Deposit_Type: "ach",
          Fee_In_Dollars: "0",
        }),
      ],
      credits: [],
      warnings: [],
    };

    const flows = activityToCashFlows(parsed, "import-1");

    expect(flows).toHaveLength(1);
    expect(flows[0].type).toBe("DEPOSIT");
    expect(flows[0].amount).toBe(100);
    expect(flows[0].date).toBe("2026-04-06");
    expect(flows[0].import_id).toBe("import-1");
  });

  it("should create a separate FEE cash flow when deposit has a fee", () => {
    const parsed = {
      deposits: [
        createMockKalshiDepositRow({
          Amount_In_Dollars: "10",
          Original_Date: "2026-02-09T00:38:08.678Z",
          Deposit_Type: "debit",
          Fee_In_Dollars: "0.2",
        }),
      ],
      credits: [],
      warnings: [],
    };

    const flows = activityToCashFlows(parsed, "import-1");

    expect(flows).toHaveLength(2);
    const deposit = flows.find((flow) => flow.type === "DEPOSIT");
    const fee = flows.find((flow) => flow.type === "FEE");
    expect(deposit).toBeDefined();
    expect(fee).toBeDefined();
    expect(fee!.amount).toBe(-0.2);
  });

  it("should map credits to ADJUSTMENT cash flows", () => {
    const parsed = {
      deposits: [],
      credits: [
        createMockKalshiCreditRow({
          Amount_In_Dollars: "5",
          Original_Date: "2026-02-09T22:26:32.622Z",
          Credit_Reason: "Big Game Deposit Delay Credit",
        }),
      ],
      warnings: [],
    };

    const flows = activityToCashFlows(parsed, "import-1");

    expect(flows).toHaveLength(1);
    expect(flows[0].type).toBe("ADJUSTMENT");
    expect(flows[0].amount).toBe(5);
    expect(flows[0].description).toContain("Big Game Deposit Delay Credit");
  });

  it("should return empty array for empty parsed activity", () => {
    const parsed = { deposits: [], credits: [], warnings: [] };
    const flows = activityToCashFlows(parsed, "import-1");
    expect(flows).toHaveLength(0);
  });
});
