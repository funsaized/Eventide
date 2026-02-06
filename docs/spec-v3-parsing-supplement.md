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
const sortedTrades = [...symbolTrades].sort((a, b) =>
  new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
);

// Track open positions
let openYes = 0;
let openNo = 0;

for (const trade of sortedTrades) {
  const quantity = getTradeQuantity(trade);
  const side = trade.subtype;
  const price = trade.tradePrice ?? 0;

  if (side === "YES") {
    if (openNo > 0) {
      // This YES trade might be closing a NO position (sell NO = buy YES)
      const closeQty = Math.min(quantity, openNo);
      const closePrice = 1 - price;
      if (closeQty > 0) {
        entries.push({ side: "NO", type: "CLOSE", quantity: closeQty, price: closePrice });
        openNo -= closeQty;
      }
      // Remaining quantity opens new YES position
      const openQty = quantity - closeQty;
      if (openQty > 0) {
        entries.push({ side: "YES", type: "OPEN", quantity: openQty, price });
        openYes += openQty;
      }
    } else {
      entries.push({ side: "YES", type: "OPEN", quantity, price });
      openYes += quantity;
    }
  } else {
    // NO trade
    if (openYes > 0) {
      // This NO trade might be closing a YES position (sell YES = buy NO)
      const closeQty = Math.min(quantity, openYes);
      const closePrice = 1 - price;
      if (closeQty > 0) {
        entries.push({ side: "YES", type: "CLOSE", quantity: closeQty, price: closePrice });
        openYes -= closeQty;
      }
      // Remaining quantity opens new NO position
      const openQty = quantity - closeQty;
      if (openQty > 0) {
        entries.push({ side: "NO", type: "OPEN", quantity: openQty, price });
        openNo += openQty;
      }
    } else {
      entries.push({ side: "NO", type: "OPEN", quantity, price });
      openNo += quantity;
    }
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
// Context tracks settlements to avoid duplicates
const existingSettlements = new Set<string>();       // from statement data
const generatedSyntheticSettlements = new Set<string>(); // synthetically created

for (const trade of trades) {
  if (trade.tradeType !== "Final Settlement") continue;

  const quantity = trade.qtyLong > 0 ? trade.qtyLong : trade.qtyShort;
  const statementSide = trade.subtype;
  const statementPrice = trade.tradePrice;
  const oppositeSide = statementSide === "YES" ? "NO" : "YES";
  const oppositePrice = 1 - statementPrice;

  // Add settlement for the statement side
  entries.push({
    symbol: trade.symbol,
    side: statementSide,
    type: "SETTLE",
    price: statementPrice,
    settlementPrice: statementPrice,
    quantity,
  });

  // Generate opposite side settlement if not already present
  // Track both existing settlements from the statement AND synthetically generated ones
  const oppositeKey = `${trade.symbol}|${oppositeSide}`;
  if (!existingSettlements.has(oppositeKey) && !generatedSyntheticSettlements.has(oppositeKey)) {
    entries.push({
      symbol: trade.symbol,
      side: oppositeSide,
      type: "SETTLE",
      price: oppositePrice,
      settlementPrice: oppositePrice,
      quantity,
    });
    generatedSyntheticSettlements.add(oppositeKey);
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

When a settlement is found for one team, generate synthetic settlements for both YES and NO sides of the opposing team symbol:

```typescript
const opposingSymbol = findOpposingTeamSymbol(trade.symbol, allSymbols);
if (opposingSymbol && !settlementsBySymbol.has(opposingSymbol)) {
  // Derive opposing team prices from the original settlement
  const opposingYesPrice = statementSide === "NO" ? statementPrice : oppositePrice;
  const opposingNoPrice = 1 - opposingYesPrice;

  const opposingYesKey = `${opposingSymbol}|YES`;
  const opposingNoKey = `${opposingSymbol}|NO`;

  if (!generatedSyntheticSettlements.has(opposingYesKey)) {
    entries.push({ symbol: opposingSymbol, side: "YES", type: "SETTLE",
      price: opposingYesPrice, settlementPrice: opposingYesPrice, quantity });
    generatedSyntheticSettlements.add(opposingYesKey);
  }

  if (!generatedSyntheticSettlements.has(opposingNoKey)) {
    entries.push({ symbol: opposingSymbol, side: "NO", type: "SETTLE",
      price: opposingNoPrice, settlementPrice: opposingNoPrice, quantity });
    generatedSyntheticSettlements.add(opposingNoKey);
  }
}
```

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
  tradeDate: string;           // ISO format YYYY-MM-DD
  accountType: string;         // "SW" = Swaps/Event Contracts
  totalQtyLong: number;        // Total quantity of long contracts
  totalQtyShort: number;       // Total quantity of short contracts
  subtype: "YES" | "NO";
  symbol: string;
  exchange: string;            // "Kalshi"
  expDate: string | null;      // Settlement date
  commissions: number;
  exchangeFees: number;
  nfaFees: number;
  totalFees: number;           // commissions + exchangeFees + nfaFees
  currency: string;            // "USD"
  description: string;         // Human-readable event name
  rawText?: string;            // Raw row text for debugging
}
```

### 10.2 Attribution Strategy

Fees are attributed to individual trades by matching on `symbol + tradeDate` (not side):

```typescript
// Group summaries by symbol and date for fee attribution
function groupBySymbolAndDate(
  summaries: TradeConfirmationSummary[]
): Map<string, TradeConfirmationSummary[]> {
  const groups = new Map<string, TradeConfirmationSummary[]>();

  for (const summary of summaries) {
    const key = `${summary.symbol}|${summary.tradeDate}`;
    const existing = groups.get(key) ?? [];
    existing.push(summary);
    groups.set(key, existing);
  }

  return groups;
}

// Get total fees for a symbol on a specific date
function getFeesForSymbolDate(
  summaries: TradeConfirmationSummary[],
  symbol: string,
  date: string
): number {
  const matching = summaries.filter(
    (s) => s.symbol === symbol && s.tradeDate === date
  );
  return matching.reduce((sum, s) => sum + s.totalFees, 0);
}
```

**Fee validation**: Section 3 total fees are cross-checked against Section 10's `totalCommissionsAndFees` field. A discrepancy >$1.00 generates a warning.

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

The `MarketCategory` type defines 13 categories:

```typescript
type MarketCategory =
  | "NFL" | "NBA" | "MLB" | "NHL"
  | "Soccer" | "Tennis" | "Golf"
  | "Economics" | "Politics" | "Weather"
  | "Entertainment" | "Crypto" | "Other";
```

Patterns are ordered by specificity (most specific first). Each uses broad matching to cover game, player prop, and playoff variants:

```typescript
const CATEGORY_PATTERNS: CategoryPattern[] = [
  // Sports - American Football
  { pattern: /^KX.*NFL(?:GAME|PLAYER|PROP)?/i, category: "NFL" },
  { pattern: /^KX.*(?:SUPERBOWL|SB[0-9]+)/i, category: "NFL" },
  { pattern: /^KX.*NCAA[AF]?(?:GAME|FB)?/i, category: "Other" },   // College Football → "Other"
  { pattern: /^KX.*CFBGAME/i, category: "Other" },

  // Sports - Basketball
  { pattern: /^KX.*NBA(?:GAME|PLAYER|PROP)?/i, category: "NBA" },
  { pattern: /^KX.*(?:NBAALLSTAR|NBAFINALS)/i, category: "NBA" },
  { pattern: /^KX.*NCAAB(?:GAME)?/i, category: "Other" },          // College Basketball → "Other"

  // Sports - Baseball & Hockey
  { pattern: /^KX.*MLB(?:GAME|PLAYER)?/i, category: "MLB" },
  { pattern: /^KX.*(?:WORLDSERIES|MLBPLAYOFF)/i, category: "MLB" },
  { pattern: /^KX.*NHL(?:GAME|PLAYER)?/i, category: "NHL" },
  { pattern: /^KX.*STANLEYCUP/i, category: "NHL" },

  // Sports - Soccer, Tennis, Golf
  { pattern: /^KX.*(?:SOCCER|MLS|UEFA|FIFA|EPL|LALIGA|BUNDESLIGA|SERIEA|LIGUE1)/i, category: "Soccer" },
  { pattern: /^KX.*(?:USO(?:MEN|WOMEN)|USOPEN)/i, category: "Tennis" },
  { pattern: /^KX.*(?:WIMBLEDON|FRENCHOPEN|AUSOPEN|TENNIS)/i, category: "Tennis" },
  { pattern: /^KX.*(?:GOLF|PGA|MASTERS|USOPEN|THEOPEN|PGACHAMP)/i, category: "Golf" },

  // Sports - Other (Combat, Motorsports, Olympics)
  { pattern: /^KX.*(?:UFC|MMA|BOXING|FIGHT)/i, category: "Other" },
  { pattern: /^KX.*(?:NASCAR|F1|INDY|RACING)/i, category: "Other" },
  { pattern: /^KX.*(?:OLYMPICS|TRACK|SWIM)/i, category: "Other" },

  // Economics (all subcategories map to "Economics")
  { pattern: /^KX.*(?:FED|FOMC|FEDRATE|FEDDECISION)/i, category: "Economics" },
  { pattern: /^KX.*(?:CPI|INFLATION|PCE)/i, category: "Economics" },
  { pattern: /^KX.*(?:GDP|GROWTH)/i, category: "Economics" },
  { pattern: /^KX.*(?:JOBS|JOBLESS|UNEMPLOYMENT|NONFARM|NFP|PAYROLL)/i, category: "Economics" },
  { pattern: /^KX.*(?:RETAIL|HOUSING|ISM|PMI|TRADE)/i, category: "Economics" },

  // Politics (all subcategories map to "Politics")
  { pattern: /^KX.*(?:ELECTION|PRESIDENT|POTUS|PRES[0-9]+)/i, category: "Politics" },
  { pattern: /^KX.*(?:CONGRESS|SENATE|HOUSE|GOV)/i, category: "Politics" },
  { pattern: /^KX.*(?:PRIMARY|CAUCUS|VOTE)/i, category: "Politics" },
  { pattern: /^KX.*(?:IMPEACH|SCOTUS|SUPREME)/i, category: "Politics" },

  // Weather, Crypto, Entertainment
  { pattern: /^KX.*(?:WEATHER|TEMP|TEMPERATURE|HURRICANE|STORM)/i, category: "Weather" },
  { pattern: /^KX.*(?:BTC|BITCOIN|ETH|ETHEREUM|CRYPTO)/i, category: "Crypto" },
  { pattern: /^KX.*(?:OSCAR|EMMY|GRAMMY|AWARD)/i, category: "Entertainment" },
  { pattern: /^KX.*(?:MOVIE|BOXOFFICE|TV|STREAMING)/i, category: "Entertainment" },
];
```

**Note**: Unmatched symbols default to `"Other"`. College sports (NCAA football, NCAA basketball, March Madness) also map to `"Other"`, not their own categories.

---

## 12. Import Pipeline

### 12.1 Pipeline Overview

The pipeline has two entry points: `importStatement()` for the full import (with persistence), and `parseDocument()` for parsing-only (used in validation/preview).

```typescript
// Main entry point for imports
async function importStatement(
  file: File,
  options: ImportOptions = {},
  onProgress?: ProgressCallback
): Promise<ImportResult> {
  // Phase 1: Extract PDF text with positions
  const document = await loadPDFFromFile(file, { password: options.password });

  // Phase 2: Parse and calculate (delegates to parseDocument)
  const parsedData = await parseDocument(document, options.verbose);

  // Phase 3: Check for duplicate statement (same account + date)
  if (!options.skipDuplicateCheck) {
    const existing = await checkDuplicateImport(
      "robinhood", parsedData.accountNumber, parsedData.statementDate
    );
    if (existing) return { success: false, error: "Duplicate statement detected", ... };
  }

  // Phase 4: Check if import should be blocked based on P&L validation
  const blockDecision = shouldBlockImport(parsedData.pnlValidation, options.strictMode);
  if (blockDecision.block) return { success: false, error: blockDecision.reason, ... };

  // Phase 5: Persist to database in a transaction
  const importId = await persistImport(parsedData);

  return { success: true, importId, ... };
}

// Parsing-only entry point (no persistence)
async function parseDocument(
  document: ExtractedDocument,
  verbose = false
): Promise<ParsedImportData> {
  const pageWidth = document.pages[0]?.width ?? 612;

  // Step 1: Detect section boundaries
  const boundaries = detectSectionBoundaries(document);
  validateRequiredSections(boundaries);

  // Step 2: Extract account metadata from Section 1 (header)
  const metadata = extractStatementMetadata(headerItems);

  // Step 3: Parse all sections
  const section2 = parseSection2(getSection(boundaries, "section2"), pageWidth);
  const section3 = parseSection3(getSection(boundaries, "section3"), pageWidth);  // optional
  const section4 = parseSection4(getSection(boundaries, "section4"), pageWidth, periodStart, periodEnd);
  const section5 = parseSection5(getSection(boundaries, "section5"), pageWidth);
  const section6 = parseSection6(getSection(boundaries, "section6"), pageWidth);
  const section7 = parseSection7(getSection(boundaries, "section7"), pageWidth);  // optional
  const section10 = parseSection10(getSection(boundaries, "section10"), pageWidth);

  // Step 4: Merge trades with deduplication (Section 2 + Section 4)
  const mergedTrades = mergeTradesWithDeduplication(section2.trades, section4.trades);

  // Step 5: Convert to FIFO entries (with sell-as-buy-opposite logic)
  const tradeEntries = convertAllTradesToEntries(mergedTrades.mergedTrades);

  // Step 6: Attribute fees from Section 3
  const feeAttribution = attributeFees(tradeEntries, section3.summaries);

  // Step 7: Cross-check Section 3 fees against Section 10 total
  if (Math.abs(section3TotalFees - section10TotalFees) > 1.0) { /* warn */ }

  // Step 8: Calculate FIFO P&L
  const fifoResults = calculateAllPositions(feeAttribution.trades);

  // Step 9: Validate against Section 5 (source of truth)
  const pnlValidation = validatePnlAgainstSection5(fifoResults, section5.pairedPositions);

  return { accountNumber, statementDate, periodStart, periodEnd,
    accountSummary, tradesWithFees, pairedPositions, journalEntries,
    openPositions, feeSummaries, fifoResults, pnlValidation, feeAttribution, warnings };
}
```

**Import Phases** (reported via `ProgressCallback`):
```typescript
type ImportPhase =
  | "EXTRACTING"         // PDF text extraction
  | "DETECTING_SECTIONS" // Section boundary detection
  | "PARSING_SECTIONS"   // All section parsing
  | "CALCULATING_PNL"    // FIFO P&L calculation
  | "VALIDATING"         // P&L validation against Section 5
  | "PERSISTING"         // Database transaction
  | "COMPLETE"           // Success
  | "FAILED";            // Error
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
function isRepeatedHeader(rowText: string, columnConfigs: ColumnConfig[]): boolean {
  const lowerText = rowText.toLowerCase();

  // Count column header matches using regex patterns
  let headerMatchCount = 0;
  for (const config of columnConfigs) {
    if (config.headerPatterns.some(p => p.test(lowerText))) {
      headerMatchCount++;
    }
  }

  // If 3+ headers found, this is likely a repeated header row
  return headerMatchCount >= 3;
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
