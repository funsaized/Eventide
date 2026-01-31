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

```typescript
const SECTION_HEADERS = [
  { id: "section2", pattern: /Monthly Trade Confirmations/i },
  { id: "section3", pattern: /Trade Confirmation Summary/i },
  { id: "section4", pattern: /Purchase and Sale(?!\s+Summary)/i },
  { id: "section5", pattern: /Purchase and Sale Summary/i },
  { id: "section6", pattern: /Journal Entries/i },
  { id: "section7", pattern: /Open Positions(?!\s+Summary)/i },
  { id: "section8", pattern: /Open Position Summary/i },
  { id: "section9", pattern: /Margin Calls/i },
  { id: "section10", pattern: /Account Summary/i },
] as const;

interface SectionBoundary {
  id: string;
  startIndex: number;      // Index in TextItem array
  startPage: number;
  endIndex: number | null; // null if extends to end of document
  endPage: number | null;
}

function detectSectionBoundaries(textItems: TextItem[]): SectionBoundary[] {
  const boundaries: SectionBoundary[] = [];
  
  for (let i = 0; i < textItems.length; i++) {
    const item = textItems[i];
    
    for (const section of SECTION_HEADERS) {
      if (section.pattern.test(item.text)) {
        // Close previous section
        if (boundaries.length > 0) {
          const prev = boundaries[boundaries.length - 1];
          prev.endIndex = i - 1;
          prev.endPage = textItems[i - 1]?.page ?? prev.startPage;
        }
        
        boundaries.push({
          id: section.id,
          startIndex: i,
          startPage: item.page,
          endIndex: null,
          endPage: null,
        });
        break;
      }
    }
  }
  
  return boundaries;
}
```

### 2.2 Column Position Calibration

The PDF doesn't have explicit column delimiters. Use spatial clustering to associate values with columns.

```typescript
interface ColumnDefinition {
  name: string;
  xMin: number;  // Percentage from left edge (0-100)
  xMax: number;
}

function calibrateColumns(
  headerRow: TextItem[],
  pageWidth: number
): ColumnDefinition[] {
  // Sort by x-position
  const sorted = [...headerRow].sort((a, b) => a.x - b.x);
  
  const columns: ColumnDefinition[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const xPercent = (item.x / pageWidth) * 100;
    
    // Column extends from current x to next column's x (or 100%)
    const nextX = sorted[i + 1] 
      ? (sorted[i + 1].x / pageWidth) * 100 
      : 100;
    
    columns.push({
      name: normalizeColumnName(item.text),
      xMin: xPercent,
      xMax: nextX,
    });
  }
  
  return columns;
}

function assignToColumn(
  item: TextItem,
  columns: ColumnDefinition[],
  pageWidth: number
): string | null {
  const xPercent = (item.x / pageWidth) * 100;
  
  for (const col of columns) {
    if (xPercent >= col.xMin && xPercent < col.xMax) {
      return col.name;
    }
  }
  
  return null;
}
```

---

## 3. Section 2: Monthly Trade Confirmations

### 3.1 Schema

```typescript
interface TradeConfirmationRow {
  tradeDate: Date;
  accountType: string;           // "SW" = Swaps/Event Contracts
  qtyLong: number;
  qtyShort: number;
  subtype: "YES" | "NO";
  symbol: string;
  contractYear: number;
  contractMonth: number;
  exchange: string;              // "Kalshi"
  expDate: Date;
  tradePrice: Decimal;           // 0.00 to 1.00
  currency: string;              // "USD"
  tradeType: "Trade" | "Final Settlement";
  description: string;           // Human-readable name
}
```

### 3.2 Column Mapping

| PDF Column | Field | Notes |
|------------|-------|-------|
| Trade Date | tradeDate | Format: YYYY-MM-DD |
| AT | accountType | Always "SW" for event contracts |
| Qty Long | qtyLong | Number of contracts (YES position) |
| Qty Short | qtyShort | Number of contracts (NO position) |
| Subtype | subtype | "YES" or "NO" |
| Symbol | symbol | Contract identifier |
| Contract Year | contractYear | 4-digit year |
| Month | contractMonth | Not present - derived from symbol |
| Exchange | exchange | "Kalshi" |
| Exp Date | expDate | Settlement date |
| Trade Price | tradePrice | Price per contract |
| Currency Code | currency | "USD" |
| Trade Type | tradeType | "Trade" or "Final Settlement" |
| Description | description | Human-readable event name |

### 3.3 Parsing Logic

```typescript
function parseSection2(
  textItems: TextItem[],
  boundary: SectionBoundary
): TradeConfirmationRow[] {
  const sectionItems = textItems.slice(boundary.startIndex, boundary.endIndex ?? undefined);
  
  // 1. Find column header row (first row after section header)
  const headerRowIndex = findHeaderRow(sectionItems, [
    "Trade Date", "AT", "Qty Long", "Subtype", "Symbol"
  ]);
  
  if (headerRowIndex === -1) {
    throw new ParseError("Section 2 column headers not found");
  }
  
  // 2. Calibrate columns from header row
  const headerItems = extractRowItems(sectionItems, headerRowIndex);
  const columns = calibrateColumns(headerItems, PAGE_WIDTH);
  
  // 3. Extract data rows
  const rows: TradeConfirmationRow[] = [];
  let currentRow: Partial<TradeConfirmationRow> = {};
  let lastY = -1;
  
  for (let i = headerRowIndex + 1; i < sectionItems.length; i++) {
    const item = sectionItems[i];
    
    // Check for new section (stop parsing)
    if (isNewSectionHeader(item.text)) break;
    
    // Check for repeated header (multi-page table)
    if (isColumnHeader(item.text, columns)) continue;
    
    // Detect row change by Y-position delta
    const isNewRow = lastY !== -1 && Math.abs(item.y - lastY) > ROW_THRESHOLD;
    
    if (isNewRow && isRowComplete(currentRow)) {
      rows.push(normalizeRow(currentRow));
      currentRow = {};
    }
    
    // Assign value to column
    const columnName = assignToColumn(item, columns, PAGE_WIDTH);
    if (columnName) {
      // Handle multi-line values (e.g., wrapped symbols)
      if (currentRow[columnName] && columnName === "symbol") {
        currentRow[columnName] += " " + item.text;
      } else {
        currentRow[columnName] = parseColumnValue(columnName, item.text);
      }
    }
    
    lastY = item.y;
  }
  
  // Don't forget last row
  if (isRowComplete(currentRow)) {
    rows.push(normalizeRow(currentRow));
  }
  
  return rows;
}
```

### 3.4 Key Patterns

**Trade Type Identification**:
- `tradeType = "Trade"`: Entry or exit trade
- `tradeType = "Final Settlement"`: Contract resolved at expiration

**Settlement Price Interpretation**:
- `0E-8` (scientific notation) = `0.00` = YES outcome did NOT happen
- `1.00000000` = `1.00` = YES outcome DID happen

**Position Direction**:
- `qtyLong > 0` with `subtype = "YES"`: Bought YES contracts
- `qtyLong > 0` with `subtype = "NO"`: Bought NO contracts (betting against)

---

## 4. Section 5: Purchase and Sale Summary

### 4.1 Schema

This is the **authoritative source** for P&L figures. Our calculated P&L must match these values.

```typescript
interface PurchaseSaleSummaryRow {
  tradeDate: Date;              // Month of activity
  accountType: string;
  totalQtyLong: number;
  totalQtyShort: number;
  subtype: "YES" | "NO";
  symbol: string;
  contractYear: number;
  contractMonth: number;
  exchange: string;
  expDate: Date;
  grossPnl: Decimal;            // SOURCE OF TRUTH for P&L
  currency: string;
  description: string;
}
```

### 4.2 P&L Interpretation

The Purchase and Sale Summary shows **two rows per resolved position**:

1. **YES row**: Shows the cost basis (negative if you bought YES)
2. **NO row**: Shows the settlement proceeds (positive if YES won)

**Example - Philadelphia game (YES won)**:
```
Symbol: KXNFLGAME-25SEP04DALPHI-PHI
YES row: grossPnl = -$102.20  (cost of 130 YES contracts)
NO row:  grossPnl = +$130.00  (settlement at $1.00 × 130)
Net P&L: +$27.80
```

### 4.3 Parsing Logic

```typescript
function parseSection5(
  textItems: TextItem[],
  boundary: SectionBoundary
): PurchaseSaleSummaryRow[] {
  // Similar structure to Section 2 parsing
  // Key difference: grossPnl column contains P&L figures
  
  const rows = extractRows(textItems, boundary);
  
  return rows.map(row => ({
    ...row,
    grossPnl: parseDecimal(row.grossPnl), // Handle negative values
  }));
}

// Helper to pair YES/NO rows for same position
function pairPositionRows(
  rows: PurchaseSaleSummaryRow[]
): Map<string, { yes: PurchaseSaleSummaryRow; no: PurchaseSaleSummaryRow }> {
  const pairs = new Map();
  
  for (const row of rows) {
    // Key by symbol + expDate (unique per contract)
    const key = `${row.symbol}_${row.expDate.toISOString()}`;
    
    if (!pairs.has(key)) {
      pairs.set(key, { yes: null, no: null });
    }
    
    if (row.subtype === "YES") {
      pairs.get(key).yes = row;
    } else {
      pairs.get(key).no = row;
    }
  }
  
  return pairs;
}
```

---

## 5. Section 6: Journal Entries

### 5.1 Schema

```typescript
interface JournalEntryRow {
  date: Date;
  accountType: string;
  description: string;
  currency: string;
  creditDebit: Decimal;  // Positive = deposit, Negative = withdrawal
}
```

### 5.2 Cash Flow Classification

```typescript
type CashFlowType = "DEPOSIT" | "WITHDRAWAL" | "INTEREST" | "FEE" | "ADJUSTMENT";

function classifyCashFlow(row: JournalEntryRow): CashFlowType {
  const desc = row.description.toLowerCase();
  
  if (row.creditDebit > 0) {
    if (desc.includes("interest")) return "INTEREST";
    return "DEPOSIT";
  } else {
    if (desc.includes("fee")) return "FEE";
    return "WITHDRAWAL";
  }
}
```

---

## 6. Section 7: Open Positions

### 6.1 Schema

```typescript
interface OpenPositionRow {
  dateOpened: Date;
  accountType: string;
  quantityBuy: number;
  quantitySell: number;
  subtype: "YES" | "NO";
  symbol: string;
  contractYear: number;
  contractMonth: number;
  exchange: string;
  expDate: Date;
  tradePrice: Decimal;           // Entry price
  currency: string;
  settlementPrice: Decimal;      // Current market price
  tradeType: string;             // "event contract"
  description: string;
}
```

### 6.2 Unrealized P&L Calculation

```typescript
function calculateUnrealizedPnl(position: OpenPositionRow): Decimal {
  const quantity = position.quantityBuy || position.quantitySell;
  const entryPrice = position.tradePrice;
  const currentPrice = position.settlementPrice;
  
  // For YES positions: profit if current > entry
  // For NO positions: profit if current < entry
  if (position.subtype === "YES") {
    return (currentPrice - entryPrice) * quantity;
  } else {
    return (entryPrice - currentPrice) * quantity;
  }
}
```

---

## 7. Section 10: Account Summary

### 7.1 Schema

```typescript
interface AccountSummaryRow {
  field: string;
  swValue: Decimal;    // SW (Swaps) column
  usValue: Decimal;    // US column (usually 0)
}

interface AccountSummary {
  beginningCashBalance: Decimal;
  commissions: Decimal;
  exchangeFees: Decimal;
  nfaFees: Decimal;
  totalCommissionsAndFees: Decimal;
  grossProfitAndLoss: Decimal;
  eventContractTradeCosts: Decimal;
  cashActivity: Decimal;
  endingCashBalance: Decimal;
  openTradeEquity: Decimal;
  totalEquity: Decimal;
  netLiquidity: Decimal;
  eventContractsMarketValue: Decimal;
  initialMargin: Decimal;
  marginExcessDeficit: Decimal;
  marginCall: Decimal;
}
```

### 7.2 Parsing Logic

Section 10 uses a different format: field labels in first column, values in subsequent columns.

```typescript
function parseSection10(
  textItems: TextItem[],
  boundary: SectionBoundary
): AccountSummary {
  const fieldMap: Record<string, keyof AccountSummary> = {
    "Beginning Cash Balance": "beginningCashBalance",
    "Commissions": "commissions",
    "Exchange Fees": "exchangeFees",
    "NFA Fees": "nfaFees",
    "Total Commissions and Fees": "totalCommissionsAndFees",
    "Gross Profit and Loss": "grossProfitAndLoss",
    "Event Contract Trade Costs / Proceeds": "eventContractTradeCosts",
    "Cash Activity": "cashActivity",
    "Ending Cash Balance": "endingCashBalance",
    "Open Trade Equity / Unrealized Profit and Loss": "openTradeEquity",
    "Total Equity": "totalEquity",
    "Net Liquidity": "netLiquidity",
    "Event Contracts Open Position Market Value": "eventContractsMarketValue",
    "Initial Margin": "initialMargin",
    "Margin Excess / Deficit": "marginExcessDeficit",
    "Margin Call": "marginCall",
  };
  
  const summary: Partial<AccountSummary> = {};
  
  // Parse as key-value pairs where first text item is field name
  // and subsequent items on same row are values
  const rows = groupByRow(textItems.slice(boundary.startIndex));
  
  for (const row of rows) {
    if (row.length < 2) continue;
    
    const fieldLabel = row[0].text.trim();
    const fieldKey = fieldMap[fieldLabel];
    
    if (fieldKey) {
      // SW column is typically the second value
      const swValue = parseDecimal(row[1]?.text ?? "0");
      summary[fieldKey] = swValue;
    }
  }
  
  return summary as AccountSummary;
}
```

---

## 8. Position Reconstruction Algorithm

### 8.1 The Challenge

A single "position" may span:
- Multiple entry trades at different prices
- Multiple exit trades or settlements
- Prior statement periods (trades opened before this month)

### 8.2 Position Ledger

```typescript
interface PositionLedger {
  positions: Map<string, Position>;  // Keyed by symbol + subtype
}

interface Position {
  symbol: string;
  subtype: "YES" | "NO";
  description: string;
  trades: TradeEntry[];
  settlement: SettlementEntry | null;
  status: "OPEN" | "CLOSED";
}

interface TradeEntry {
  date: Date;
  quantity: number;
  price: Decimal;
  fees: Decimal;
  source: "section2" | "section4";  // Track origin for deduplication
}

interface SettlementEntry {
  date: Date;
  quantity: number;
  settlementPrice: Decimal;  // 0.00 or 1.00 (or partial)
}
```

### 8.3 Building the Ledger

```typescript
function buildPositionLedger(
  section2Trades: TradeConfirmationRow[],
  section4Trades: PurchaseSaleRow[],
  section5Summary: PurchaseSaleSummaryRow[]
): PositionLedger {
  const ledger: PositionLedger = { positions: new Map() };
  
  // Step 1: Process Section 2 trades (current month only)
  for (const trade of section2Trades) {
    const key = `${trade.symbol}_${trade.subtype}`;
    
    if (!ledger.positions.has(key)) {
      ledger.positions.set(key, {
        symbol: trade.symbol,
        subtype: trade.subtype,
        description: trade.description,
        trades: [],
        settlement: null,
        status: "OPEN",
      });
    }
    
    const position = ledger.positions.get(key)!;
    
    if (trade.tradeType === "Final Settlement") {
      position.settlement = {
        date: trade.expDate,
        quantity: trade.qtyLong || trade.qtyShort,
        settlementPrice: trade.tradePrice,
      };
      position.status = "CLOSED";
    } else {
      position.trades.push({
        date: trade.tradeDate,
        quantity: trade.qtyLong || trade.qtyShort,
        price: trade.tradePrice,
        fees: new Decimal(0), // Fees come from Section 3
        source: "section2",
      });
    }
  }
  
  // Step 2: Incorporate prior-month trades from Section 4
  // These are trades that SETTLED this month but were OPENED earlier
  for (const trade of section4Trades) {
    const key = `${trade.symbol}_${trade.subtype}`;
    const position = ledger.positions.get(key);
    
    // If this trade exists in Section 2, skip (avoid double-counting)
    const isDuplicate = position?.trades.some(t => 
      isSameDay(t.date, trade.tradeDate) &&
      t.quantity === trade.quantity &&
      t.price.equals(trade.price)
    );
    
    if (!isDuplicate && trade.tradeType === "Trade") {
      // This is a prior-month trade
      if (!position) {
        ledger.positions.set(key, {
          symbol: trade.symbol,
          subtype: trade.subtype,
          description: trade.description,
          trades: [],
          settlement: null,
          status: "OPEN",
        });
      }
      
      ledger.positions.get(key)!.trades.push({
        date: trade.tradeDate,
        quantity: trade.quantity,
        price: trade.price,
        fees: new Decimal(0),
        source: "section4",
      });
    }
  }
  
  return ledger;
}
```

---

## 9. P&L Calculation & Validation

### 9.1 FIFO Cost Basis Calculation

For event contracts, P&L is simpler than traditional securities because contracts settle at 0 or 1 (or exit via opposing trade).

```typescript
function calculatePositionPnl(position: Position): CalculatedPnl {
  // Sort trades chronologically (FIFO)
  const sortedTrades = [...position.trades].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  
  // Calculate total cost basis
  const totalQuantity = sortedTrades.reduce((sum, t) => sum + t.quantity, 0);
  const totalCost = sortedTrades.reduce(
    (sum, t) => sum.plus(t.price.times(t.quantity)), 
    new Decimal(0)
  );
  const avgEntryPrice = totalCost.div(totalQuantity);
  
  // Calculate proceeds based on settlement
  let proceeds: Decimal;
  
  if (position.settlement) {
    // Contract settled at expiration
    proceeds = position.settlement.settlementPrice.times(totalQuantity);
  } else if (position.status === "CLOSED") {
    // Position closed via opposing trade (need to find exit trades)
    // This is more complex - involves matching exit trades
    proceeds = calculateExitProceeds(position);
  } else {
    // Position still open - no realized P&L
    return { grossPnl: new Decimal(0), isRealized: false };
  }
  
  const grossPnl = proceeds.minus(totalCost);
  
  return {
    grossPnl,
    isRealized: true,
    totalQuantity,
    avgEntryPrice,
    exitPrice: position.settlement?.settlementPrice ?? new Decimal(0),
  };
}
```

### 9.2 Validation Against Section 5

Section 5 is the source of truth. Our calculations must match within tolerance.

```typescript
interface ValidationResult {
  isValid: boolean;
  discrepancies: PnlDiscrepancy[];
  totalCalculated: Decimal;
  totalReported: Decimal;
}

interface PnlDiscrepancy {
  symbol: string;
  subtype: "YES" | "NO";
  calculatedPnl: Decimal;
  reportedPnl: Decimal;
  delta: Decimal;
}

const PNL_TOLERANCE = new Decimal("0.01"); // ±$0.01 per position

function validatePnlAgainstStatement(
  calculatedPositions: Map<string, CalculatedPnl>,
  section5Summary: PurchaseSaleSummaryRow[]
): ValidationResult {
  const discrepancies: PnlDiscrepancy[] = [];
  let totalCalculated = new Decimal(0);
  let totalReported = new Decimal(0);
  
  // Group Section 5 by symbol for easier lookup
  const reportedBySymbol = groupBy(section5Summary, row => row.symbol);
  
  for (const [key, calculated] of calculatedPositions) {
    const [symbol, subtype] = key.split("_");
    
    // Find matching Section 5 row
    const reportedRows = reportedBySymbol.get(symbol) ?? [];
    const matchingRow = reportedRows.find(r => r.subtype === subtype);
    
    if (!matchingRow) {
      // Position not in Section 5 - might be open or error
      continue;
    }
    
    const reportedPnl = matchingRow.grossPnl;
    const delta = calculated.grossPnl.minus(reportedPnl).abs();
    
    totalCalculated = totalCalculated.plus(calculated.grossPnl);
    totalReported = totalReported.plus(reportedPnl);
    
    if (delta.gt(PNL_TOLERANCE)) {
      discrepancies.push({
        symbol,
        subtype: subtype as "YES" | "NO",
        calculatedPnl: calculated.grossPnl,
        reportedPnl,
        delta,
      });
    }
  }
  
  return {
    isValid: discrepancies.length === 0,
    discrepancies,
    totalCalculated,
    totalReported,
  };
}
```

### 9.3 Handling Two-Sided Positions

The same event can have both YES and NO activity (hedging or early exit).

```typescript
// Example: Georgia vs Tennessee game
// Symbol: KXNCAAFGAME-25SEP13UGATENN-TENN (Tennessee)
// Symbol: KXNCAAFGAME-25SEP13UGATENN-UGA (Georgia)
// 
// These are DIFFERENT contracts but SAME event.
// Only one can settle at $1.00.

function isRelatedContract(symbol1: string, symbol2: string): boolean {
  // Extract base event from symbol
  // KXNCAAFGAME-25SEP13UGATENN-TENN -> KXNCAAFGAME-25SEP13UGATENN
  // KXNCAAFGAME-25SEP13UGATENN-UGA  -> KXNCAAFGAME-25SEP13UGATENN
  
  const base1 = symbol1.substring(0, symbol1.lastIndexOf("-"));
  const base2 = symbol2.substring(0, symbol2.lastIndexOf("-"));
  
  return base1 === base2;
}

function calculateEventNetPnl(
  positions: Position[],
  eventBaseSymbol: string
): Decimal {
  // Sum P&L across all related contracts for the same event
  return positions
    .filter(p => p.symbol.startsWith(eventBaseSymbol))
    .reduce((sum, p) => sum.plus(calculatePositionPnl(p).grossPnl), new Decimal(0));
}
```

---

## 10. Symbol Parsing & Categorization

### 10.1 Symbol Structure

```
KX[SPORT/EVENT][DETAILS]-[YYMONDD][MATCHUP]-[OUTCOME]
```

Examples:
- `KXNFLGAME-25SEP04DALPHI-PHI` → NFL game, Sep 4 2025, Dallas vs Philadelphia, outcome: Philadelphia
- `KXFEDDECISION-25SEP-C25` → Fed decision, Sep 2025, Cut 25bps
- `KXUSOMENSINGLES-25-JS` → US Open Men's Singles 2025, Jannik Sinner

### 10.2 Category Patterns

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

function categorizeSymbol(symbol: string): string {
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(symbol)) {
      return category;
    }
  }
  return "Uncategorized";
}
```

### 10.3 Event Date Extraction

```typescript
function extractEventDate(symbol: string): Date | null {
  // Pattern: YYMONDD embedded in symbol
  // Example: 25SEP04 = September 4, 2025
  
  const datePattern = /(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2})/i;
  const match = symbol.match(datePattern);
  
  if (!match) return null;
  
  const [, year, month, day] = match;
  const monthMap: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  
  return new Date(
    2000 + parseInt(year),
    monthMap[month.toUpperCase()],
    parseInt(day)
  );
}
```

---

## 11. Full Import Pipeline

### 11.1 Pipeline Overview

```typescript
async function importStatement(pdfFile: File): Promise<ImportResult> {
  // Phase 1: Extract
  const document = await loadPDF(pdfFile);
  const textItems = await extractTextWithPositions(document);
  
  // Phase 2: Detect & Segment
  const boundaries = detectSectionBoundaries(textItems);
  validateRequiredSections(boundaries);
  
  // Phase 3: Parse Each Section
  const section2 = parseSection2(textItems, boundaries.find(b => b.id === "section2")!);
  const section4 = parseSection4(textItems, boundaries.find(b => b.id === "section4")!);
  const section5 = parseSection5(textItems, boundaries.find(b => b.id === "section5")!);
  const section6 = parseSection6(textItems, boundaries.find(b => b.id === "section6")!);
  const section7 = parseSection7(textItems, boundaries.find(b => b.id === "section7"));
  const section10 = parseSection10(textItems, boundaries.find(b => b.id === "section10")!);
  
  // Phase 4: Build Position Ledger
  const ledger = buildPositionLedger(section2, section4, section5);
  
  // Phase 5: Calculate P&L
  const calculatedPnl = new Map<string, CalculatedPnl>();
  for (const [key, position] of ledger.positions) {
    calculatedPnl.set(key, calculatePositionPnl(position));
  }
  
  // Phase 6: Validate Against Statement
  const validation = validatePnlAgainstStatement(calculatedPnl, section5);
  
  if (!validation.isValid) {
    // Log discrepancies but use statement figures as source of truth
    console.warn("P&L discrepancies found:", validation.discrepancies);
  }
  
  // Phase 7: Transform to Database DTOs
  const importDto = transformToImportDto({
    section2,
    section4,
    section5,
    section6,
    section7,
    section10,
    calculatedPnl,
    validation,
  });
  
  // Phase 8: Persist (all-or-nothing transaction)
  await persistImport(importDto);
  
  return {
    success: true,
    tradesImported: importDto.trades.length,
    closedPositions: importDto.closedPositions.length,
    openPositions: importDto.openPositions.length,
    netLiquidity: section10.netLiquidity,
    validationWarnings: validation.discrepancies,
  };
}
```

### 11.2 Error Handling Strategy

```typescript
interface ParseError {
  phase: "extract" | "segment" | "parse" | "calculate" | "validate" | "persist";
  section?: string;
  message: string;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

function handleParseError(error: ParseError): never {
  // All errors reject the entire import (no partial imports)
  throw new ImportFailedError({
    message: `Import failed at ${error.phase}` + 
             (error.section ? ` (${error.section})` : "") +
             `: ${error.message}`,
    phase: error.phase,
    section: error.section,
    context: error.context,
  });
}
```

---

## 12. Output DTOs (Database Mapping)

### 12.1 Statement Import DTO

Maps to `statement_imports` table:

```typescript
interface StatementImportDto {
  id: string;                    // Generated UUID
  platform: "robinhood";
  accountNumber: string;         // From header
  statementDate: Date;           // From header
  statementPeriodStart: Date;
  statementPeriodEnd: Date;
  parserVersion: string;         // e.g., "v1.0"
  importTimestamp: Date;
  pdfStoredUntil: Date;          // 12 months from import
  netLiquidity: Decimal;         // From Section 10
  totalFees: Decimal;            // From Section 10
  endingCash: Decimal;           // From Section 10
}
```

### 12.2 Trade DTO

Maps to `trades` table:

```typescript
interface TradeDto {
  id: string;
  importId: string;
  platform: "robinhood";
  accountId: string;
  
  tradeDate: Date;
  symbol: string;
  side: "YES" | "NO";
  quantity: number;
  price: Decimal;
  fees: Decimal;
  
  tradeType: "OPEN" | "CLOSE" | "ADJUST";
  category: string;              // Auto-categorized
  
  settlementDate: Date | null;
  settlementPrice: Decimal | null;
  
  platformMetadata: {
    exchange: string;
    contractYear: number;
    description: string;
    originalTradeType: string;   // "Trade" | "Final Settlement"
  };
}
```

### 12.3 Closed Position DTO

Maps to `closed_positions` table:

```typescript
interface ClosedPositionDto {
  id: string;
  importId: string;
  platform: "robinhood";
  
  symbol: string;
  entryDate: Date;
  exitDate: Date;
  entryPrice: Decimal;           // VWAP of entries
  exitPrice: Decimal;            // Settlement or exit price
  quantity: number;
  
  grossPnl: Decimal;             // From Section 5 (source of truth)
  fees: Decimal;
  netPnl: Decimal;               // grossPnl - fees
  
  calculatedPnl: Decimal;        // Our FIFO calculation
  pnlDiscrepancy: Decimal;       // grossPnl - calculatedPnl
}
```

---

## 13. Validation Checkpoints

### 13.1 Post-Extraction

- [ ] All required sections detected
- [ ] Text items have valid coordinates
- [ ] Page count matches expected range

### 13.2 Post-Parsing

- [ ] All prices are in valid range (0.00 ≤ p ≤ 1.00)
- [ ] All quantities are positive integers
- [ ] All dates are valid and within statement period (or recent past)
- [ ] All symbols match expected pattern

### 13.3 Post-Calculation

- [ ] Sum of calculated P&L matches Section 10 gross P&L (within tolerance)
- [ ] Total quantity settled matches total quantity traded per symbol
- [ ] Fees sum matches Section 10 total fees

### 13.4 Pre-Persist

- [ ] No duplicate statement (same account + date)
- [ ] All foreign key references valid
- [ ] Transaction isolation verified

---

## Appendix A: Scientific Notation Handling

The PDF may contain prices in scientific notation (e.g., `0E-8` for zero).

```typescript
function parsePrice(value: string): Decimal {
  // Handle scientific notation
  if (/^[\d.]+E[+-]?\d+$/i.test(value)) {
    return new Decimal(value);
  }
  
  // Handle standard decimal
  return new Decimal(value.replace(/[^0-9.-]/g, ""));
}
```

---

## Appendix B: Multi-Page Table Handling

Tables can span multiple pages with repeated headers.

```typescript
function isRepeatedHeader(
  item: TextItem,
  originalHeaderY: number,
  currentPage: number,
  headerPage: number
): boolean {
  // Header is repeated if:
  // 1. We're on a different page
  // 2. Text matches a known column header
  // 3. Y-position is near top of page
  
  const isNewPage = currentPage !== headerPage;
  const isNearTop = item.y < 100; // Adjust based on PDF layout
  const isHeaderText = COLUMN_HEADERS.includes(item.text.trim());
  
  return isNewPage && isNearTop && isHeaderText;
}
```

---

## Appendix C: Fee Attribution

Fees from Section 3 (Trade Confirmation Summary) need to be attributed to individual trades.

```typescript
function attributeFees(
  trades: TradeDto[],
  summaryRows: TradeConfirmationSummaryRow[]
): void {
  // Group trades by symbol + date for matching
  const tradeGroups = groupBy(trades, t => `${t.symbol}_${t.tradeDate}`);
  
  for (const summary of summaryRows) {
    const key = `${summary.symbol}_${summary.tradeDate}`;
    const matchingTrades = tradeGroups.get(key) ?? [];
    
    if (matchingTrades.length === 0) continue;
    
    // Distribute fees proportionally by quantity
    const totalQty = matchingTrades.reduce((sum, t) => sum + t.quantity, 0);
    const totalFees = summary.totalCommissionsAndFees;
    
    for (const trade of matchingTrades) {
      trade.fees = totalFees.times(trade.quantity).div(totalQty);
    }
  }
}
```
