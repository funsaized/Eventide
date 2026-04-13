/**
 * Mock PDF Data for Section Parser Tests
 *
 * Provides realistic TextItem arrays that simulate PDF extraction output
 * for testing section parsers.
 */

import type { TextItem, ExtractedDocument, ExtractedPage } from "@/lib/parsing/robinhood/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a TextItem at a given position
 */
export function createTextItem(
  text: string,
  x: number,
  y: number,
  pageNumber: number = 1,
  width: number = 50,
  height: number = 10
): TextItem {
  return {
    text,
    x,
    y,
    width,
    height,
    pageNumber,
  };
}

/**
 * Create a row of TextItems positioned horizontally
 */
export function createRow(
  cells: { text: string; xPercent: number }[],
  y: number,
  pageNumber: number = 1,
  pageWidth: number = 612
): TextItem[] {
  return cells.map(cell => createTextItem(
    cell.text,
    cell.xPercent * pageWidth,
    y,
    pageNumber,
    cell.text.length * 5,
    10
  ));
}

/**
 * Create an ExtractedPage from TextItems
 */
export function createPage(
  items: TextItem[],
  pageNumber: number = 1,
  width: number = 612,
  height: number = 792
): ExtractedPage {
  return {
    pageNumber,
    width,
    height,
    items,
  };
}

/**
 * Create an ExtractedDocument from pages
 */
export function createDocument(pages: ExtractedPage[]): ExtractedDocument {
  return { pages, pageCount: pages.length };
}

// ============================================================================
// SECTION 2: MONTHLY TRADE CONFIRMATIONS MOCK DATA
// ============================================================================

/**
 * Create Section 2 header row
 */
export function createSection2Header(y: number, pageNumber: number = 1): TextItem[] {
  return createRow([
    { text: "Trade Date", xPercent: 0.02 },
    { text: "Acct Type", xPercent: 0.08 },
    { text: "Qty Long", xPercent: 0.14 },
    { text: "Qty Short", xPercent: 0.17 },
    { text: "Subtype", xPercent: 0.20 },
    { text: "Symbol", xPercent: 0.24 },
    { text: "Cntrct Yr", xPercent: 0.50 },
    { text: "Exch", xPercent: 0.55 },
    { text: "Exp Dt", xPercent: 0.60 },
    { text: "Trade Price", xPercent: 0.72 },
    { text: "Curr", xPercent: 0.85 },
    { text: "Type", xPercent: 0.90 },
  ], y, pageNumber);
}

/**
 * Create a Section 2 trade data row
 */
export function createSection2TradeRow(
  data: {
    date: string;
    accountType?: string;
    qtyLong?: number;
    qtyShort?: number;
    subtype: "YES" | "NO";
    symbol: string;
    contractYear?: number;
    exchange?: string;
    expDate?: string;
    tradePrice: string;
    currency?: string;
    tradeType?: string;
  },
  y: number,
  pageNumber: number = 1
): TextItem[] {
  return createRow([
    { text: data.date, xPercent: 0.02 },
    { text: data.accountType ?? "SW", xPercent: 0.08 },
    { text: (data.qtyLong ?? 0).toString(), xPercent: 0.14 },
    { text: (data.qtyShort ?? 0).toString(), xPercent: 0.17 },
    { text: data.subtype, xPercent: 0.20 },
    { text: data.symbol, xPercent: 0.24 },
    { text: (data.contractYear ?? 2024).toString(), xPercent: 0.50 },
    { text: data.exchange ?? "Kalshi", xPercent: 0.55 },
    { text: data.expDate ?? "", xPercent: 0.60 },
    { text: data.tradePrice, xPercent: 0.72 },
    { text: data.currency ?? "USD", xPercent: 0.85 },
    { text: data.tradeType ?? "Trade", xPercent: 0.90 },
  ], y, pageNumber);
}

/**
 * Mock Section 2 with typical trade data
 */
export function createMockSection2Data(): {
  items: TextItem[];
  expectedTrades: number;
  pageWidth: number;
} {
  const pageWidth = 612;
  const items: TextItem[] = [];
  let y = 100;

  // Section header
  items.push(createTextItem("Monthly Trade Confirmations", pageWidth * 0.3, y, 1));
  y += 20;

  // Column headers
  items.push(...createSection2Header(y));
  y += 15;

  // Trade 1: NFL game YES purchase
  items.push(...createSection2TradeRow({
    date: "09/04/2024",
    qtyLong: 10,
    subtype: "YES",
    symbol: "KXNFLGAME-24SEP04DALPHI-DAL",
    expDate: "09/04/2024",
    tradePrice: "0.65",
    tradeType: "Trade",
  }, y));
  y += 15;

  // Trade 2: Same game NO purchase
  items.push(...createSection2TradeRow({
    date: "09/04/2024",
    qtyLong: 5,
    subtype: "NO",
    symbol: "KXNFLGAME-24SEP04DALPHI-PHI",
    expDate: "09/04/2024",
    tradePrice: "0.35",
    tradeType: "Trade",
  }, y));
  y += 15;

  // Trade 3: Economics Fed decision
  items.push(...createSection2TradeRow({
    date: "09/18/2024",
    qtyLong: 20,
    subtype: "YES",
    symbol: "KXFEDRATE-24SEP18-25BPCUT",
    expDate: "09/18/2024",
    tradePrice: "0.70",
    tradeType: "Trade",
  }, y));
  y += 15;

  // Trade 4: Final settlement (scientific notation price)
  items.push(...createSection2TradeRow({
    date: "09/04/2024",
    qtyShort: 10,
    subtype: "YES",
    symbol: "KXNFLGAME-24SEP04DALPHI-DAL",
    expDate: "09/04/2024",
    tradePrice: "0E-8",
    tradeType: "Final Settlement",
  }, y));
  y += 15;

  // Trade 5: Settlement at 1.00
  items.push(...createSection2TradeRow({
    date: "09/04/2024",
    qtyShort: 5,
    subtype: "NO",
    symbol: "KXNFLGAME-24SEP04DALPHI-PHI",
    expDate: "09/04/2024",
    tradePrice: "1.00000000",
    tradeType: "Final Settlement",
  }, y));

  return {
    items,
    expectedTrades: 5,
    pageWidth,
  };
}

/**
 * Mock Section 2 with multi-line wrapped symbol
 */
export function createMockSection2WithWrappedSymbol(): {
  items: TextItem[];
  expectedTrades: number;
  pageWidth: number;
} {
  const pageWidth = 612;
  const items: TextItem[] = [];
  let y = 100;

  // Section header
  items.push(createTextItem("Monthly Trade Confirmations", pageWidth * 0.3, y, 1));
  y += 20;

  // Column headers
  items.push(...createSection2Header(y));
  y += 15;

  // Trade with very long symbol that wraps
  items.push(...createSection2TradeRow({
    date: "09/15/2024",
    qtyLong: 15,
    subtype: "YES",
    symbol: "KXNFLGAME-24SEP15",
    expDate: "09/15/2024",
    tradePrice: "0.55",
    tradeType: "Trade",
  }, y));
  y += 15;

  // Continuation of symbol on next line
  items.push(createTextItem("SFNYG-SF", pageWidth * 0.24, y, 1));
  y += 15;

  // Another normal trade
  items.push(...createSection2TradeRow({
    date: "09/20/2024",
    qtyLong: 10,
    subtype: "NO",
    symbol: "KXNBAGAME-24SEP20LAKBOS-BOS",
    expDate: "09/20/2024",
    tradePrice: "0.40",
    tradeType: "Trade",
  }, y));

  return {
    items,
    expectedTrades: 2,
    pageWidth,
  };
}

// ============================================================================
// SECTION 5: PURCHASE AND SALE SUMMARY MOCK DATA
// ============================================================================

/**
 * Create Section 5 header row
 */
export function createSection5Header(y: number, pageNumber: number = 1): TextItem[] {
  return createRow([
    { text: "Trade Mo", xPercent: 0.02 },
    { text: "Acct Type", xPercent: 0.08 },
    { text: "Tot Qty Long", xPercent: 0.14 },
    { text: "Tot Qty Short", xPercent: 0.20 },
    { text: "Subtype", xPercent: 0.26 },
    { text: "Symbol", xPercent: 0.30 },
    { text: "Cntrct Yr", xPercent: 0.52 },
    { text: "Exch", xPercent: 0.58 },
    { text: "Exp Dt", xPercent: 0.64 },
    { text: "Gross P&L", xPercent: 0.78 },
    { text: "Curr", xPercent: 0.92 },
  ], y, pageNumber);
}

/**
 * Create a Section 5 summary row
 */
export function createSection5SummaryRow(
  data: {
    tradeMo?: string;
    accountType?: string;
    totalQtyLong?: number;
    totalQtyShort?: number;
    subtype: "YES" | "NO";
    symbol: string;
    contractYear?: number;
    exchange?: string;
    expDate?: string;
    grossPnl: string;
    currency?: string;
  },
  y: number,
  pageNumber: number = 1
): TextItem[] {
  return createRow([
    { text: data.tradeMo ?? "SEP 2024", xPercent: 0.02 },
    { text: data.accountType ?? "SW", xPercent: 0.08 },
    { text: (data.totalQtyLong ?? 0).toString(), xPercent: 0.14 },
    { text: (data.totalQtyShort ?? 0).toString(), xPercent: 0.20 },
    { text: data.subtype, xPercent: 0.26 },
    { text: data.symbol, xPercent: 0.30 },
    { text: (data.contractYear ?? 2024).toString(), xPercent: 0.52 },
    { text: data.exchange ?? "Kalshi", xPercent: 0.58 },
    { text: data.expDate ?? "", xPercent: 0.64 },
    { text: data.grossPnl, xPercent: 0.78 },
    { text: data.currency ?? "USD", xPercent: 0.92 },
  ], y, pageNumber);
}

/**
 * Mock Section 5 with paired YES/NO positions
 */
export function createMockSection5Data(): {
  items: TextItem[];
  expectedRows: number;
  expectedPairs: number;
  expectedTotalPnl: number;
  pageWidth: number;
} {
  const pageWidth = 612;
  const items: TextItem[] = [];
  let y = 100;

  // Section header
  items.push(createTextItem("Purchase and Sale Summary", pageWidth * 0.3, y, 1));
  y += 20;

  // Column headers
  items.push(...createSection5Header(y));
  y += 15;

  // Position 1: NFL game - YES row (bought YES at 0.65, lost)
  items.push(...createSection5SummaryRow({
    totalQtyLong: 10,
    totalQtyShort: 10,
    subtype: "YES",
    symbol: "KXNFLGAME-24SEP04DALPHI-DAL",
    expDate: "09/04/2024",
    grossPnl: "(6.50)", // Lost $6.50 (bought at 0.65, settled at 0)
  }, y));
  y += 15;

  // Position 1: NFL game - NO row (settlement proceeds)
  items.push(...createSection5SummaryRow({
    totalQtyLong: 10,
    totalQtyShort: 10,
    subtype: "NO",
    symbol: "KXNFLGAME-24SEP04DALPHI-DAL",
    expDate: "09/04/2024",
    grossPnl: "0.00", // NO side settles at 1, but we didn't hold NO
  }, y));
  y += 15;

  // Position 2: Fed decision - YES row (bought YES at 0.70, won)
  items.push(...createSection5SummaryRow({
    totalQtyLong: 20,
    totalQtyShort: 20,
    subtype: "YES",
    symbol: "KXFEDRATE-24SEP18-25BPCUT",
    expDate: "09/18/2024",
    grossPnl: "6.00", // Profit: (1.00 - 0.70) * 20 = $6.00
  }, y));
  y += 15;

  // Position 2: Fed decision - NO row
  items.push(...createSection5SummaryRow({
    totalQtyLong: 20,
    totalQtyShort: 20,
    subtype: "NO",
    symbol: "KXFEDRATE-24SEP18-25BPCUT",
    expDate: "09/18/2024",
    grossPnl: "0.00",
  }, y));
  y += 15;

  // Position 3: NBA game - winning position
  items.push(...createSection5SummaryRow({
    totalQtyLong: 5,
    totalQtyShort: 5,
    subtype: "YES",
    symbol: "KXNBAGAME-24SEP20LAKBOS-LAK",
    expDate: "09/20/2024",
    grossPnl: "2.50", // Profit
  }, y));
  y += 15;

  items.push(...createSection5SummaryRow({
    totalQtyLong: 5,
    totalQtyShort: 5,
    subtype: "NO",
    symbol: "KXNBAGAME-24SEP20LAKBOS-LAK",
    expDate: "09/20/2024",
    grossPnl: "0.00",
  }, y));

  // Total P&L: -6.50 + 0 + 6.00 + 0 + 2.50 + 0 = 2.00
  return {
    items,
    expectedRows: 6,
    expectedPairs: 3,
    expectedTotalPnl: 2.00,
    pageWidth,
  };
}

/**
 * Mock Section 5 with negative P&L (parentheses format)
 */
export function createMockSection5WithNegativePnl(): {
  items: TextItem[];
  expectedTotalPnl: number;
  pageWidth: number;
} {
  const pageWidth = 612;
  const items: TextItem[] = [];
  let y = 100;

  // Section header
  items.push(createTextItem("Purchase and Sale Summary", pageWidth * 0.3, y, 1));
  y += 20;

  // Column headers
  items.push(...createSection5Header(y));
  y += 15;

  // Losing position - YES
  items.push(...createSection5SummaryRow({
    totalQtyLong: 100,
    totalQtyShort: 100,
    subtype: "YES",
    symbol: "KXNFLGAME-24SEP08SFOAK-SF",
    expDate: "09/08/2024",
    grossPnl: "(50.00)", // Lost $50
  }, y));
  y += 15;

  // Losing position - NO
  items.push(...createSection5SummaryRow({
    totalQtyLong: 100,
    totalQtyShort: 100,
    subtype: "NO",
    symbol: "KXNFLGAME-24SEP08SFOAK-SF",
    expDate: "09/08/2024",
    grossPnl: "(25.00)", // Lost $25 more
  }, y));

  return {
    items,
    expectedTotalPnl: -75.00,
    pageWidth,
  };
}

// ============================================================================
// FULL DOCUMENT MOCK
// ============================================================================

/**
 * Create a complete mock document with multiple sections
 */
export function createMockFullDocument(): ExtractedDocument {
  const pageWidth = 612;
  const pageHeight = 792;

  const page1Items: TextItem[] = [];
  let y = 50;

  // Section 1: Header
  page1Items.push(createTextItem("Robinhood Derivatives", pageWidth * 0.3, y, 1));
  y += 30;
  page1Items.push(createTextItem("Monthly Statement", pageWidth * 0.35, y, 1));
  y += 30;
  page1Items.push(createTextItem("Account: XXXX1234", pageWidth * 0.1, y, 1));
  y += 15;
  page1Items.push(createTextItem("Period: 09/01/2024 - 09/30/2024", pageWidth * 0.1, y, 1));
  y += 30;

  // Section 2: Monthly Trade Confirmations
  page1Items.push(createTextItem("Monthly Trade Confirmations", pageWidth * 0.3, y, 1));
  y += 20;
  page1Items.push(...createSection2Header(y, 1));
  y += 15;

  // Add trades
  page1Items.push(...createSection2TradeRow({
    date: "09/04/2024",
    qtyLong: 10,
    subtype: "YES",
    symbol: "KXNFLGAME-24SEP04DALPHI-DAL",
    expDate: "09/04/2024",
    tradePrice: "0.65",
    tradeType: "Trade",
  }, y, 1));
  y += 15;

  page1Items.push(...createSection2TradeRow({
    date: "09/04/2024",
    qtyShort: 10,
    subtype: "YES",
    symbol: "KXNFLGAME-24SEP04DALPHI-DAL",
    expDate: "09/04/2024",
    tradePrice: "0.00",
    tradeType: "Final Settlement",
  }, y, 1));
  y += 30;

  // Section 4: Purchase and Sale
  page1Items.push(createTextItem("Purchase and Sale", pageWidth * 0.35, y, 1));
  y += 30;

  // Section 5: Purchase and Sale Summary
  page1Items.push(createTextItem("Purchase and Sale Summary", pageWidth * 0.3, y, 1));
  y += 20;
  page1Items.push(...createSection5Header(y, 1));
  y += 15;

  page1Items.push(...createSection5SummaryRow({
    totalQtyLong: 10,
    totalQtyShort: 10,
    subtype: "YES",
    symbol: "KXNFLGAME-24SEP04DALPHI-DAL",
    expDate: "09/04/2024",
    grossPnl: "(6.50)",
  }, y, 1));
  y += 15;

  page1Items.push(...createSection5SummaryRow({
    totalQtyLong: 10,
    totalQtyShort: 10,
    subtype: "NO",
    symbol: "KXNFLGAME-24SEP04DALPHI-DAL",
    expDate: "09/04/2024",
    grossPnl: "0.00",
  }, y, 1));
  y += 30;

  // Section 6: Journal Entries
  page1Items.push(createTextItem("Journal Entries", pageWidth * 0.35, y, 1));
  y += 30;

  // Section 10: Account Summary
  page1Items.push(createTextItem("Account Summary", pageWidth * 0.35, y, 1));
  y += 20;
  page1Items.push(createTextItem("Net Liquidity: $1,234.56", pageWidth * 0.1, y, 1));
  y += 15;
  page1Items.push(createTextItem("Ending Cash: $1,234.56", pageWidth * 0.1, y, 1));

  return createDocument([
    createPage(page1Items, 1, pageWidth, pageHeight),
  ]);
}

// ============================================================================
// BOUNDARY MOCK DATA
// ============================================================================

/**
 * Create a mock SectionBoundary for testing
 */
export function createMockSectionBoundary(
  items: TextItem[],
  id: "section2" | "section4" | "section5" = "section2"
): {
  id: typeof id;
  name: string;
  startIndex: number;
  endIndex: number;
  startPage: number;
  endPage: number;
  headerItem: TextItem;
  items: TextItem[];
} {
  const names = {
    section2: "Monthly Trade Confirmations",
    section4: "Purchase and Sale",
    section5: "Purchase and Sale Summary",
  };

  return {
    id,
    name: names[id],
    startIndex: 0,
    endIndex: items.length,
    startPage: 1,
    endPage: 1,
    headerItem: items[0],
    items,
  };
}
