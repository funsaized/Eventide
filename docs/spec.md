# Product Requirements Document (PRD): Prediction Market Charting Platform

## 1. Executive Summary

**Vision**
A "Monarch/Mint/YNAB for Prediction Markets"—a comprehensive budgeting and analytics platform for tracking, analyzing, and optimizing prediction market trading activity.

**Core Value Proposition**
Users currently lack visibility into their true performance, fees, and net liquidity because their data is locked in static PDF statements. This platform ingests those PDFs to visualize financial health, revealing the "true cost of trading" and separating skill (ROI) from cash injections.

**Target User**
Active traders on prediction markets (Kalshi, ForecastEx) who use Robinhood Derivatives and need retrospective analysis tools.

---

## 2. Data Ingestion & Parsing Strategy

The core technical challenge is accurately extracting structured data from the Robinhood Derivatives Monthly Statement.

### 2.1 Statement Structure Mapping
The parser must extract data from the following ten sections identified in the source PDF:

| PDF Section | Target Database Table | Key Data Points | Purpose in App |
| :--- | :--- | :--- | :--- |
| **1. Header** | `accounts` | Account #, Client Name, Date | Multi-account support & duplicate prevention. |
| **2. Monthly Trade Confirmations** | `trades` | Date, Subtype (YES/NO), Symbol, Price, Qty | The granular "atomic unit" for the **Trade Journal**. |
| **3. Trade Confirmation Summary** | `daily_summaries` | Commission, Exchange Fees, NFA Fees | Powers **Fee & Cost Analysis**. |
| **4. Purchase and Sale** | `closed_positions` | Transaction Price, Buy/Sell Offset | Calculating precise entry/exit points. |
| **5. Purchase and Sale Summary** | `performance_metrics` | Gross P&L | Powers **Realized P&L** dashboard metric. |
| **6. Journal Entries** | `cash_flow` | Deposits, Withdrawals, Dates | Powers **Cash Flow** (distinguishing profit from deposits). |
| **7. Open Positions** | `open_positions` | Cost basis vs. Current Price | Powers "Unrealized P&L" analysis. |
| **8. Open Position Summary** | `portfolio_snapshot` | Market Value, Unrealized P&L | High-level portfolio health check. |
| **9. Margin Calls** | `alerts` | Call Amount, Date | Risk management alerts (low priority). |
| **10. Account Summary** | `monthly_snapshots` | Net Liquidity, Total Fees, Ending Cash | Source of truth for **Dashboard** tiles. |

### 2.2 Parsing Logic & Heuristics
* **Symbol Decoding:** The parser must regex the `Symbol` field (e.g., `KXNFLGAME-25SEP04DALPHI-PHI`) to auto-tag categories:
    * `KXNFL...` $\rightarrow$ **Category:** NFL
    * `KXFEDDECISION...` $\rightarrow$ **Category:** Economics/Fed
    * `KXUSOMENSINGLES...` $\rightarrow$ **Category:** Tennis
* **Fee Handling:** Fees in the PDF are often represented as negative numbers (e.g., `-1.00`). The system must sum absolute values to calculate "Total Costs" accurately.
* **Page Spanning:** Tables (specifically Section 2 and 4) often span multiple pages. The parser must detect headers to identify start points and handle page breaks continuously without losing rows.

---

## 3. Functional Features

### 3.1 Portfolio Overview Dashboard
**User Story:** "As a trader, I want to see my Net Liquidity and true Win Rate instantly so I know if I'm actually making money."
* **Data Source:**
    * *Net Liquidity:* Extracted from Section 10 (Account Summary).
    * *Unrealized P&L:* Extracted from Section 8 (Open Position Summary).
* **Visuals:** Dark-themed tiles with "Monarch-style" clean typography and rounded corners.

### 3.2 Performance Analytics
**User Story:** "I want to know if I'm better at betting on the NFL or Fed Interest Rates."
* **Data Source:** Section 5 (Purchase and Sale Summary) provides the `Gross P&L` per realized trade.
* **Logic:** Group `Gross P&L` by the parsed `Symbol` category.
* **Visualization:** Bar chart comparing ROI across categories and Treemaps for volume distribution.

### 3.3 Fee & Cost Analysis
**User Story:** "I want to see how much commission is eating into my profits."
* **Data Source:** Section 3 (Trade Confirmation Summary) lists `Commission` and `Exchange Fees` daily.
* **Calculation:** $$\text{Net P\&L} = \text{Gross P\&L} - |\text{Total Fees}|$$
* **Insight:** Display a "Fee Drag" metric showing fees as a percentage of total volume.

### 3.4 Cash Flow Engine
**User Story:** "I need to separate my trading profits from the $500 I just deposited."
* **Data Source:** Section 6 (Journal Entries) explicitly lists "Deposit" and "Withdrawal" line items.
* **Logic:**
    * `Bankroll` = Sum(Deposits) - Sum(Withdrawals)
    * `Trading Profit` = Net Liquidity - Bankroll

---

## 4. Technical Specifications

### 4.1 Architecture
* **Type:** Local-first Web Application (PWA).
* **Frontend:** Next.js (React) + Tailwind CSS (Shadcn UI for components).
* **Database:** SQLite (local file) to store parsed statement data. Use this as a starting point for your architectural ideations.
* **Parser Engine:** Python backend (using `pdf-parse` or `tabula-py`) or client-side JS PDF parser (`pdf.js`) if processing strictly locally.

Note: Architecture should favor best practices, modern decision making, and maintainability (considering this will be a solo developer venture).

### 4.2 Database Schema (MVP)

Note: this is a starting point. You are not limited and you are expected to ideate and iterated on this. 

```sql
CREATE TABLE statement_imports (
    id TEXT PRIMARY KEY,
    statement_date DATE,
    account_number TEXT,
    net_liquidity DECIMAL -- Source: Section 10
);

CREATE TABLE trades (
    id TEXT PRIMARY KEY,
    import_id TEXT,
    date DATE,
    symbol TEXT,        -- Source: Section 2
    side TEXT,          -- "YES" or "NO"
    qty INTEGER,
    price DECIMAL,
    fees DECIMAL,       -- Derived from Section 3
    gross_pnl DECIMAL,  -- Derived from Section 5
    category TEXT       -- Parsed from Symbol (e.g., "NFL")
);

CREATE TABLE cash_flows (
    id TEXT PRIMARY KEY,
    date DATE,
    type TEXT,          -- "Deposit" or "Withdrawal"
    amount DECIMAL      -- Source: Section 6
);

### 5. UI/UX Requirements
Visual Identity: "Dark Monarch" — Friendly, intuitive fintech vibes but with a dark theme native to trading environments.

Navigation: Expandable sidebar (Dashboard, Journal, Reports, Settings).

Responsiveness: Grid layout that adapts tiles from 4-across (Desktop) to 1-across (Mobile).

Interaction: Interactive graphs (Line Charts, Sankey Diagrams) that allow hovering to see specific data points.

### 6. Implementation Phases
Phase 1 (Ingestion MVP): Build the PDF parser that successfully populates the SQLite DB from RH0033791565-2.pdf. Focus on regex reliability for the Symbol field.

Phase 2 (Dashboard): Build the "Portfolio Overview" reading from the statement_imports and open_positions tables. Implement the "Dark Monarch" UI components.

Phase 3 (Analytics): Implement the Symbol parsing logic to enable Category-based reporting and the Cash Flow engine to separate Deposits from Profits.
