# PDF Parsing Strategy - Detailed Implementation Guide
**Supplement to spec-v3.md Section 3**

---

## Overview

This document provides detailed parsing logic for Robinhood Derivatives monthly statements, based on analysis of actual statement structure. It replaces and expands Section 3 of spec-v3.md with implementation-ready specifications.

---

## 1. Statement Structure Analysis

### 1.1 Section Inventory

A Robinhood Derivatives monthly statement contains the following sections:

| Section | Header Text | Purpose | Required |
|---------|-------------|---------|----------|
| 1 | Statement header (no explicit header) | Account info, statement date | ✅ |
| 2 | "Monthly Trade Confirmations" | Individual trade executions | ✅ |
| 3 | "Trade Confirmation Summary" | Aggregated trades with fees | ⚠️ Optional |
| 4 | "Purchase and Sale" | Complete position lifecycle | ✅ |
| 5 | "Purchase and Sale Summary" | **Source of truth for P&L** | ✅ |
| 6 | "Journal Entries" | Deposits/withdrawals | ✅ |
| 7 | "Open Positions" | Positions not yet settled | ⚠️ Optional |
| 8 | "Open Position Summary" | Aggregated open positions | ⚠️ Optional |
| 9 | "Margin Calls" | Margin call history | ⚠️ Optional |
| 10 | "Account Summary" | Net liquidity, totals | ✅ |

### 1.2 Key Insight: Data Redundancy

The statement contains **multiple representations of the same data** for different purposes:

- **Monthly Trade Confirmations** (Section 2): Raw transaction log for the current month only
- **Purchase and Sale** (Section 4): Includes trades from prior months that settled this month
- **Purchase and Sale Summary** (Section 5): Authoritative P&L figures

**Critical**: Section 4 (Purchase and Sale) may contain trades opened in prior statement periods. Cross-reference with Section 2 to avoid double-counting when processing multi-month data.

---

## 2. Section Detection & Extraction

### 2.1 Section Boundary Detection

Section detection uses regex patterns matched against flattened PDF text items:

```typescript
const SECTION_DEFINITIONS: SectionDefinition[] = [
  { id: "section1", pattern: /^Robinhood\s+Derivatives/i, required: true },
  { id: "section2", pattern: /Monthly\s+Trade\s+Confirmations?/i, required: true },
  { id: "section3", pattern: /Trade\s+Confirmation\s+Summary/i, required: false },
  { id: "section4", pattern: /Purchase\s+and\s+Sale(?!\s+Summary)/i, required: true },
  { id: "section5", pattern: /Purchase\s+and\s+Sale\s+Summary/i, required: true },
  { id: "section6", pattern: /Journal\s+Entries/i, required: true },
  { id: "section7", pattern: /Open\s+Positions?(?!\s+Summary)/i, required: false },
  { id: "section8", pattern: /Open\s+Position\s+Summary/i, required: false },
  { id: "section9", pattern: /Margin\s+Calls?/i, required: false },
  { id: "section10", pattern: /Account\s+Summary/i, required: true },
];
```

**Handling Split Headers**: Headers like "Monthly Trade Confirmations" may be split across multiple text items. The boundary detector combines adjacent items on the same line before matching.

### 2.2 Column Position Calibration

The PDF doesn't have explicit column delimiters. Use spatial clustering to associate values with columns:

```typescript
interface ColumnPosition {
  name: string;
  leftPercent: number;   // Percentage of page width (0-1)
  rightPercent: number;
  leftAbsolute: number;
  rightAbsolute: number;
}

function calibrateColumns(
  headerItems: TextItem[],
  expectedColumns: ColumnConfig[],
  pageWidth: number
): ColumnLayout;
```

---

## 3. Section 2: Monthly Trade Confirmations

### 3.1 Schema

```typescript
interface TradeConfirmation {
  tradeDate: string;           // ISO format YYYY-MM-DD
  accountType: string;         // "SW" = Swaps/Event Contracts
  qtyLong: number;             // Bought contracts
  qtyShort: number;            // Sold contracts
  subtype: "YES" | "NO";
  symbol: string;
  contractYear: number | null;
  exchange: string;            // "Kalshi"
  expDate: string | null;      // Settlement date
  tradePrice: number;          // 0.00 to 1.00
  currency: string;            // "USD"
  tradeType: "Trade" | "Final Settlement";
  description: string;
  source: "section2" | "section4";
}
```

### 3.2 Column Mapping

| PDF Column | Field | Notes |
|------------|-------|-------|
| Trade Date | tradeDate | Format: YYYY-MM-DD |
| AT | accountType | Always "SW" for event contracts |
| Qty Long | qtyLong | Number of contracts bought |
| Qty Short | qtyShort | Number of contracts sold |
| Subtype | subtype | "YES" or "NO" |
| Symbol | symbol | Contract identifier |
| Contract Year | contractYear | 4-digit year |
| Exchange | exchange | "Kalshi" |
| Exp Date | expDate | Settlement date |
| Trade Price | tradePrice | Price per contract |
| Currency Code | currency | "USD" |
| Trade Type | tradeType | "Trade" or "Final Settlement" |
| Description | description | Human-readable event name |

### 3.3 Key Patterns

**Trade Type Identification**:
- `tradeType = "Trade"`: Entry or exit trade
- `tradeType = "Final Settlement"`: Contract resolved at expiration

**Settlement Price Interpretation**:
- `0E-8` (scientific notation) = `0.00` = YES outcome did NOT happen
- `1.00000000` = `1.00` = YES outcome DID happen

**Position Direction**:
- `qtyLong > 0`: Bought contracts (opening or covering)
- `qtyShort > 0`: Sold contracts (closing or shorting)

---

## 4. Trade Merging & Deduplication

### 4.1 Section 2 vs Section 4

Section 2 contains only current month trades. Section 4 contains all trades that settled this month, including those opened in prior months.

**Deduplication Strategy**:
```typescript
function areTradesDuplicate(trade1: TradeConfirmation, trade2: TradeConfirmation): boolean {
  return (
    trade1.tradeDate === trade2.tradeDate &&
    trade1.symbol === trade2.symbol &&
    trade1.subtype === trade2.subtype &&
    trade1.tradePrice === trade2.tradePrice &&
    trade1.qtyLong === trade2.qtyLong &&
    trade1.qtyShort === trade2.qtyShort
    // NOTE: Do NOT compare tradeType - Section 4 may default to "Trade"
    // while Section 2 has accurate "Final Settlement" values
  );
}
```

---

## 5. Critical: Sell-as-Buy-Opposite Logic

### 5.1 The Core Insight

**Robinhood represents "selling" as "buying the opposite side":**
- Selling YES @ $0.30 is shown as: buying NO @ $0.70 (since YES + NO = $1.00)
- Selling NO @ $0.40 is shown as: buying YES @ $0.60

This means when processing trades:
- A YES Trade could be: Opening YES **OR** Closing NO (by selling NO)
- A NO Trade could be: Opening NO **OR** Closing YES (by selling YES)

### 5.2 Round-Trip Detection

When a symbol has both YES and NO trades with matching quantities, it's a **round-trip** (buy then sell):

```typescript
const isRoundTrip = yesTrades.length > 0 && noTrades.length > 0 && yesQty === noQty;

if (isRoundTrip) {
  // YES trades are OPENS
  for (const trade of yesTrades) {
    entries.push({ ...trade, side: "YES", type: "OPEN" });
  }

  // NO trades are CLOSES of YES (sell YES = buy NO)
  // Close price = 1 - NO_price (the actual sell price)
  for (const trade of noTrades) {
    const closePrice = 1 - trade.tradePrice;
    entries.push({ ...trade, side: "YES", type: "CLOSE", price: closePrice });
  }
}
```

### 5.3 Mixed Scenarios

When YES and NO quantities don't match, use FIFO matching in chronological order:

```typescript
// Sort all trades by date
const allTrades = [...symbolTrades].sort((a, b) =>
  new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
);

// Track open positions
let openYes = 0;
let openNo = 0;

for (const trade of allTrades) {
  const side = trade.subtype;
  const quantity = trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort;
  const price = trade.tradePrice;

  if (side === "YES") {
    if (openNo > 0) {
      // This YES trade might be closing a NO position (sell NO = buy YES)
      const closeQty = Math.min(quantity, openNo);
      const closePrice = 1 - price;
      entries.push({ side: "NO", type: "CLOSE", quantity: closeQty, price: closePrice });
      openNo -= closeQty;
    }
    // Remaining quantity opens YES
    entries.push({ side: "YES", type: "OPEN", quantity: quantity - closeQty, price });
    openYes += quantity - closeQty;
  } else {
    // Mirror logic for NO trades
  }
}
```

### 5.4 Single-Sided Trades

When only one side has trades, they're straightforward opens:

```typescript
for (const trade of symbolTrades) {
  entries.push({
    side: trade.subtype,
    type: "OPEN",
    quantity: trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort,
    price: trade.tradePrice,
  });
}
```

---

## 6. Settlement Handling

### 6.1 Processing Settlements

Settlements (tradeType = "Final Settlement") indicate contract resolution:

```typescript
for (const trade of trades) {
  if (trade.tradeType !== "Final Settlement") continue;

  const quantity = trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort;
  const statementSide = trade.subtype;
  const statementPrice = trade.tradePrice;

  // Add settlement for the statement side
  entries.push({
    symbol: trade.symbol,
    side: statementSide,
    type: "SETTLE",
    price: statementPrice,
    settlementPrice: statementPrice,
    quantity,
  });

  // Generate opposite side settlement (if not already present)
  const oppositeKey = `${trade.symbol}|${statementSide === "YES" ? "NO" : "YES"}`;
  if (!existingSettlements.has(oppositeKey)) {
    entries.push({
      symbol: trade.symbol,
      side: statementSide === "YES" ? "NO" : "YES",
      type: "SETTLE",
      price: 1 - statementPrice,
      settlementPrice: 1 - statementPrice,
      quantity,
    });
  }
}
```

### 6.2 Cross-Symbol Settlements (Sports Games)

Sports games have opposing team symbols that are mutually exclusive:
- `KXNFLGAME-25SEP08MINCHI-MIN` (Minnesota)
- `KXNFLGAME-25SEP08MINCHI-CHI` (Chicago)

If one team wins (settles at $1.00), the other loses (settles at $0.00):

```typescript
function findOpposingTeamSymbol(symbol: string, allSymbols: Set<string>): string | null {
  const lastDashIndex = symbol.lastIndexOf('-');
  if (lastDashIndex === -1) return null;

  const baseSymbol = symbol.substring(0, lastDashIndex); // "KXNFLGAME-25SEP08MINCHI"
  const teamCode = symbol.substring(lastDashIndex + 1); // "MIN"

  // Find other symbol with same base but different team
  for (const otherSymbol of allSymbols) {
    if (otherSymbol === symbol) continue;
    const otherBase = otherSymbol.substring(0, otherSymbol.lastIndexOf('-'));
    if (otherBase === baseSymbol) {
      return otherSymbol;
    }
  }
  return null;
}
```

When a settlement is found for one team, generate synthetic settlements for the opposing team.

---

## 7. Section 5: Purchase and Sale Summary

### 7.1 Schema

```typescript
interface PurchaseSaleSummaryRow {
  tradeDate: string;
  accountType: string;
  totalQtyLong: number;
  totalQtyShort: number;
  subtype: "YES" | "NO";
  symbol: string;
  contractYear: number | null;
  exchange: string;
  expDate: string | null;
  grossPnl: number;    // SOURCE OF TRUTH for P&L
  currency: string;
  description: string;
}

interface PairedPosition {
  symbol: string;
  expDate: string | null;
  yesRow: PurchaseSaleSummaryRow | null;
  noRow: PurchaseSaleSummaryRow | null;
  netPnl: number;          // Sum of YES and NO grossPnl
  totalQuantity: number;
  description: string;
}
```

### 7.2 P&L Pairing

Section 5 shows **two rows per resolved position** (YES row + NO row):

```typescript
function pairPositionRows(rows: PurchaseSaleSummaryRow[]): PairedPosition[] {
  const positionMap = new Map<string, { yesRow: ...; noRow: ... }>();

  for (const row of rows) {
    const key = `${row.symbol}_${row.expDate ?? ""}`;
    const existing = positionMap.get(key) ?? { yesRow: null, noRow: null };

    if (row.subtype === "YES") {
      existing.yesRow = row;
    } else {
      existing.noRow = row;
    }
    positionMap.set(key, existing);
  }

  // Calculate net P&L for each position
  return Array.from(positionMap.entries()).map(([key, { yesRow, noRow }]) => ({
    symbol: yesRow?.symbol ?? noRow?.symbol,
    expDate: yesRow?.expDate ?? noRow?.expDate,
    yesRow,
    noRow,
    netPnl: (yesRow?.grossPnl ?? 0) + (noRow?.grossPnl ?? 0),
    totalQuantity: Math.max(
      (yesRow?.totalQtyLong ?? 0) + (yesRow?.totalQtyShort ?? 0),
      (noRow?.totalQtyLong ?? 0) + (noRow?.totalQtyShort ?? 0)
    ),
  }));
}
```

---

## 8. FIFO P&L Calculation

### 8.1 Trade Entry Format

```typescript
interface TradeEntry {
  date: string;
  symbol: string;
  side: "YES" | "NO";
  quantity: number;
  price: number;
  type: "OPEN" | "CLOSE" | "SETTLE";
  settlementPrice?: number;
  fees?: number;
}
```

### 8.2 FIFO Matching Algorithm

**Critical**: Sort trades by date, with OPEN trades processed before CLOSE/SETTLE on the same date:

```typescript
const sortedTrades = [...trades].sort((a, b) => {
  const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
  if (dateCompare !== 0) return dateCompare;

  // Same date: OPEN before CLOSE/SETTLE (ensures buys are in ledger before sells)
  const typeOrder = { OPEN: 0, CLOSE: 1, SETTLE: 2 };
  return typeOrder[a.type] - typeOrder[b.type];
});
```

**Position Ledger**:
```typescript
class PositionLedger {
  private positions: Map<string, PositionLot[]> = new Map();

  addOpeningTrade(trade: TradeEntry): void {
    const key = `${trade.symbol}|${trade.side}`;
    const lots = this.positions.get(key) ?? [];
    lots.push({
      date: trade.date,
      price: trade.price,
      quantity: trade.quantity,
      fees: trade.fees ?? 0,
    });
    this.positions.set(key, lots);
  }

  closePosition(trade: TradeEntry): ClosedLot[] {
    const key = `${trade.symbol}|${trade.side}`;
    const lots = this.positions.get(key) ?? [];
    const closedLots: ClosedLot[] = [];

    let remainingQty = trade.quantity;
    const exitPrice = trade.settlementPrice ?? trade.price;

    // FIFO: close oldest lots first
    while (remainingQty > 0 && lots.length > 0) {
      const oldestLot = lots[0];
      const matchQty = Math.min(remainingQty, oldestLot.quantity);

      const grossPnl = matchQty * (exitPrice - oldestLot.price);

      closedLots.push({
        entryPrice: oldestLot.price,
        exitPrice,
        quantity: matchQty,
        grossPnl,
      });

      oldestLot.quantity -= matchQty;
      remainingQty -= matchQty;

      if (oldestLot.quantity <= 0) lots.shift();
    }

    return closedLots;
  }
}
```

---

## 9. P&L Validation

### 9.1 Validation Against Section 5

Section 5 is the **source of truth**. Calculated P&L must match within tolerance:

```typescript
const PNL_TOLERANCE = 0.01; // ±$0.01 per position

function validatePnlAgainstSection5(
  fifoResults: Map<string, FifoResult>,
  section5Positions: PairedPosition[]
): ValidationResult {
  // Group FIFO results by symbol (combining YES and NO sides)
  const fifoBySymbol = new Map<string, number>();
  for (const result of fifoResults.values()) {
    const existing = fifoBySymbol.get(result.symbol) ?? 0;
    fifoBySymbol.set(result.symbol, existing + result.totalGrossPnl);
  }

  // Compare each Section 5 position
  for (const s5Position of section5Positions) {
    const calculatedPnl = fifoBySymbol.get(s5Position.symbol) ?? 0;
    const reportedPnl = s5Position.netPnl;
    const discrepancy = Math.abs(calculatedPnl - reportedPnl);

    if (discrepancy > PNL_TOLERANCE) {
      // Categorize the failure
    }
  }
}
```

### 9.2 Discrepancy Categories

**Prior-Period Issues**: `calculatedPnl = 0` but `reportedPnl ≠ 0`
- Caused by opening trades from before the statement's look-back period
- These positions have no opening trades in our data

**Both-Sided Issues**: Position has both YES and NO rows in Section 5
- Complex matching scenarios that the sell-as-buy-opposite logic may not handle perfectly
- These are often positions where the user traded both sides

**Blocking Decision**:
```typescript
function shouldBlockImport(result: ValidationResult, strictMode: boolean): boolean {
  if (result.isValid) return false;

  if (strictMode) return true;

  // Use adjustedDiscrepancy (excludes prior-period and both-sided issues)
  const totalPnl = Math.abs(result.totalReportedPnl);
  if (totalPnl > 0 && result.adjustedDiscrepancy / totalPnl > 0.1) {
    return true; // >10% discrepancy
  }

  return false;
}
```

---

## 10. Fee Attribution

### 10.1 Section 3 Fee Summaries

Section 3 provides fee summaries aggregated by symbol + date:

```typescript
interface TradeConfirmationSummary {
  tradeDate: string;
  symbol: string;
  subtype: "YES" | "NO";
  totalQty: number;
  commissions: number;
  exchangeFees: number;
  nfaFees: number;
  totalFees: number;
}
```

### 10.2 Attribution Strategy

Fees are distributed proportionally by quantity:

```typescript
function attributeFees(
  trades: TradeEntry[],
  summaries: TradeConfirmationSummary[]
): FeeAttributionResult {
  // Group trades and summaries by symbol + date + side
  const tradeGroups = new Map<string, TradeEntry[]>();
  const summaryGroups = new Map<string, TradeConfirmationSummary[]>();

  // For each summary group, distribute fees to matching trades
  for (const [key, groupSummaries] of summaryGroups) {
    const matchingTrades = tradeGroups.get(key) ?? [];
    const totalQuantity = matchingTrades.reduce((sum, t) => sum + t.quantity, 0);
    const totalFees = groupSummaries.reduce((sum, s) => sum + s.totalFees, 0);

    for (const trade of matchingTrades) {
      trade.fees = totalFees * (trade.quantity / totalQuantity);
    }
  }
}
```

---

## 11. Symbol Parsing & Categorization

### 11.1 Symbol Structure

```
KX[SPORT/EVENT][DETAILS]-[YYMONDD][MATCHUP]-[OUTCOME]
```

Examples:
- `KXNFLGAME-25SEP04DALPHI-PHI` → NFL game, Sep 4 2025, Dallas vs Philadelphia, outcome: Philadelphia
- `KXFEDDECISION-25SEP-C25` → Fed decision, Sep 2025, Cut 25bps
- `KXUSOMENSINGLES-25-JS` → US Open Men's Singles 2025, Jannik Sinner

### 11.2 Category Patterns

```typescript
const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  // Sports - Football
  { pattern: /^KXNFLGAME/i, category: "NFL" },
  { pattern: /^KXNCAAFGAME/i, category: "College Football" },

  // Sports - Other
  { pattern: /^KXNBAGAME/i, category: "NBA" },
  { pattern: /^KXMLB/i, category: "MLB" },
  { pattern: /^KXEPL/i, category: "Soccer" },
  { pattern: /^KXPGA/i, category: "Golf" },
  { pattern: /^KXUSO(MEN|WOMEN)/i, category: "Tennis" },

  // Economics
  { pattern: /^KXFEDDECISION/i, category: "Fed Decision" },
  { pattern: /^KXCPI/i, category: "CPI" },
  { pattern: /^KXGDP/i, category: "GDP" },
  { pattern: /^KXJOBLESS/i, category: "Jobs" },

  // Crypto
  { pattern: /^KXBTC/i, category: "Bitcoin" },
  { pattern: /^KXETH/i, category: "Ethereum" },

  // Politics
  { pattern: /^KXELECTION/i, category: "Elections" },
  { pattern: /^KXPRESIDENT/i, category: "Presidential" },
];
```

---

## 12. Import Pipeline

### 12.1 Pipeline Overview

```typescript
async function importStatement(pdfFile: File): Promise<ImportResult> {
  // Phase 1: Extract PDF text with positions
  const document = await loadPDFFromFile(pdfFile);

  // Phase 2: Detect section boundaries
  const boundaries = detectSectionBoundaries(document);
  validateRequiredSections(boundaries);

  // Phase 3: Parse each section
  const section2 = parseSection2(getSection(boundaries, "section2"), pageWidth);
  const section3 = parseSection3(getSection(boundaries, "section3"), pageWidth);
  const section4 = parseSection4(getSection(boundaries, "section4"), pageWidth);
  const section5 = parseSection5(getSection(boundaries, "section5"), pageWidth);
  const section6 = parseSection6(getSection(boundaries, "section6"), pageWidth);
  const section7 = parseSection7(getSection(boundaries, "section7"), pageWidth);
  const section10 = parseSection10(getSection(boundaries, "section10"), pageWidth);

  // Phase 4: Merge trades with deduplication
  const mergedTrades = mergeTradesWithDeduplication(section2.trades, section4.trades);

  // Phase 5: Convert to FIFO entries (with sell-as-buy-opposite logic)
  const tradeEntries = convertAllTradesToEntries(mergedTrades.mergedTrades);

  // Phase 6: Attribute fees from Section 3
  const feeAttribution = attributeFees(tradeEntries, section3.summaries);

  // Phase 7: Calculate FIFO P&L
  const fifoResults = calculateAllPositions(feeAttribution.trades);

  // Phase 8: Validate against Section 5
  const pnlValidation = validatePnlAgainstSection5(fifoResults, section5.pairedPositions);

  // Phase 9: Check if import should be blocked
  if (shouldBlockImport(pnlValidation, strictMode)) {
    throw new Error("P&L validation failed");
  }

  // Phase 10: Persist to database
  await persistImport(parsedData);

  return { success: true, ... };
}
```

### 12.2 Error Handling

All parsing errors reject the entire import (no partial imports):

```typescript
interface ImportResult {
  success: boolean;
  importId?: string;
  tradesImported: number;
  closedPositionsImported: number;
  openPositionsImported: number;
  cashFlowsImported: number;
  netLiquidity: number;
  totalFees: number;
  validationWarnings: string[];
  parsingWarnings: string[];
  error?: string;
  duplicateImport?: { existingId: string; existingDate: string };
}
```

---

## 13. Validation Checkpoints

### 13.1 Post-Extraction

- [ ] All required sections detected (1, 2, 4, 5, 6, 10)
- [ ] Text items have valid coordinates
- [ ] Page count within expected range

### 13.2 Post-Parsing

- [ ] All prices in valid range (0.00 ≤ p ≤ 1.00)
- [ ] All quantities are positive integers
- [ ] All dates are valid and within statement period
- [ ] All symbols match expected pattern

### 13.3 Post-Calculation

- [ ] P&L discrepancy within tolerance (adjusted for known issues)
- [ ] Fee attribution matches Section 10 total (within $1.00)
- [ ] Total quantity settled matches total quantity traded

### 13.4 Pre-Persist

- [ ] No duplicate statement (same account + date)
- [ ] All foreign key references valid
- [ ] Transaction isolation verified

---

## Appendix A: Scientific Notation Handling

The PDF may contain prices in scientific notation (e.g., `0E-8` for zero):

```typescript
function parseTradePrice(value: string): number | null {
  // Handle scientific notation
  if (/^[\d.]+E[+-]?\d+$/i.test(value)) {
    return parseFloat(value);
  }

  // Handle standard decimal
  const cleaned = value.replace(/[^0-9.-]/g, "");
  return cleaned ? parseFloat(cleaned) : null;
}
```

---

## Appendix B: Multi-Page Table Handling

Tables can span multiple pages with repeated headers:

```typescript
function isRepeatedHeader(rowText: string, expectedColumns: ColumnConfig[]): boolean {
  const keywords = expectedColumns.map(c => c.keywords).flat();
  const matchCount = keywords.filter(kw =>
    rowText.toLowerCase().includes(kw.toLowerCase())
  ).length;
  return matchCount >= 3; // At least 3 header keywords found
}
```

---

## Appendix C: Debugging Tools

The parser includes extensive debug logging controlled by `verbose` flag:

```typescript
const parsedData = await parseDocument(document, true /* verbose */);

// Outputs:
// [Import] Detected sections: section1, section2, section3, ...
// [Import] Section 2: 147 trades
// [Round-Trip] KXNFLGAME-...: YES qty=100, NO qty=100 → treating as YES open+close
// [Sell-as-Buy] KXNFLGAME-...: NO @ $0.70 → CLOSE YES @ $0.30
// [Import] FIFO calculated: Gross 123.45, Net 120.00
// === P&L COMPARISON ===
// KXNFLGAME-...: Reported 27.80, Calculated 27.80, Δ 0.00
```
