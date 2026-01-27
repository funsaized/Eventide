# Product Requirements Document v3.0: Prediction Market Analytics Platform
**Interview-Refined Specification**

---

---

## v3 Updates (January 2026)

This revision incorporates architectural guidance for a 1–3 developer team, including:
- A **modern Next.js + Tailwind v4 + shadcn/ui** setup (CSS-first Tailwind configuration, CSS variable theming).
- A **feature-first repository structure** that keeps parsing/DB logic pure and testable.
- Clear patterns for **Client Components vs Server Components** given static export + OPFS/WASM constraints.
- Practical guidance for **state management**, **“no-runtime-server” API organization**, and **MVP auth (“local lock”)**.

---
## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Technical Architecture](#2-technical-architecture)
3. [PDF Parsing Strategy](#3-pdf-parsing-strategy)
4. [Database Schema & Data Model](#4-database-schema--data-model)
5. [Core Features & User Flows](#5-core-features--user-flows)
6. [UI/UX Design System](#6-uiux-design-system)
7. [Performance & Optimization](#7-performance--optimization)
8. [Error Handling & Edge Cases](#8-error-handling--edge-cases)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment & Distribution](#10-deployment--distribution)
11. [MVP Scope & Timeline](#11-mvp-scope--timeline)
12. [Future Considerations](#12-future-considerations)

---

## 1. Executive Summary

### Vision
A local-first, privacy-preserving "Monarch/Mint for Prediction Markets"—a comprehensive analytics platform for tracking, analyzing, and optimizing prediction market trading activity across multiple platforms.

### Core Value Proposition
Traders lack visibility into their true performance because data is locked in static PDF statements. This platform ingests those PDFs locally to visualize financial health, revealing:
- **True cost of trading** (separating fees from P&L)
- **Cash flow separation** (skill/ROI vs capital injections)
- **Category-based insights** (which market types are profitable)
- **Historical performance trends** (time-series analysis)

### Target User
Active traders on prediction markets (Kalshi, ForecastEx) who use Robinhood Derivatives and need retrospective analysis tools with privacy guarantees.

### Key Differentiators
- **100% Local-First**: All data processing happens in-browser, zero server dependencies
- **Privacy-Preserving**: No cloud extraction, no telemetry, no user tracking
- **Multi-Platform**: Canonical data model supports heterogeneous statement formats
- **Open Source**: MIT/Apache licensed for community contributions and transparency

---

## 2. Technical Architecture

### 2.1 Technology Stack

#### Frontend Framework
- **Next.js 15+ (App Router)**: React framework with Server Components, streaming, and modern bundling
- **TypeScript**: Full type safety across entire codebase
- **Tailwind CSS v4**: CSS-first configuration via `@import "tailwindcss"` in `src/app/globals.css`
- **shadcn/ui**: “Copy-paste” component primitives (Radix/Base UI-backed) generated into your repo
  - Components live under `src/components/ui`
  - Theme via **CSS variables** (no runtime theme provider required for a dark-only MVP)
  - Animations via **tw-animate-css** (Tailwind v4 recommendation)
- **React 19** (or latest supported by your Next.js version)

**Modern styling setup (App Router)**:
1. **Global CSS**: `src/app/globals.css`
   ```css
   @import "tailwindcss";
   @import "tw-animate-css";

   /* shadcn/ui uses this pattern for dark mode in Tailwind v4 */
   @custom-variant dark (&:is(.dark *));
   ```
2. **Import globals once**: in `src/app/layout.tsx`:
   ```ts
   import "./globals.css";
   ```
3. **Initialize shadcn/ui** (generates `components.json`, installs deps, sets up CSS vars):
   - `pnpm dlx shadcn@latest init` (or `npx shadcn@latest init`)
4. **Add components as code**:
   - `pnpm dlx shadcn@latest add button dialog tabs table ...`

> Note: Tailwind v4 moves most customization into CSS (`@theme`, `@plugin`, etc.). Keep design tokens as CSS variables (see Section 6).


#### Database Layer
- **wa-sqlite**: WASM SQLite with OPFS persistence
- **OPFS (Origin Private File System)**: Native browser persistence API
- **Browser Support**: Chromium-only (Chrome, Edge, Brave) for MVP
  - Firefox/Safari explicitly blocked with clear messaging
  - OPFS provides true filesystem persistence without manual save/load

#### State Management
- **TanStack Query v5**: Data fetching, caching, background updates
  - Manages SQLite query results as "server state"
  - Automatic refetch on focus, network reconnect
  - Optimistic updates for mutations
- **Zustand**: Lightweight global state for UI concerns
  - Upload progress tracking
  - Filter state (persisted to localStorage)
  - User preferences (theme, default view)
  - Modal/sidebar visibility

#### PDF Processing
- **pdf.js (Mozilla)**: Client-side PDF rendering and text extraction
- **Custom Parser Engine**: Hybrid strategy
  - Text anchors for section detection (e.g., "Monthly Trade Confirmations")
  - Relative column positions for tabular data extraction
  - Version detection via statement date mapping

#### Charting & Visualization
- **Recharts**: Declarative React charting library
  - Line charts (time-series performance)
  - Bar charts (category comparison)
  - Treemaps (volume distribution)
  - Sparklines (tile micro-visualizations)
- **TanStack Table v8**: Headless table library for trade journal
  - Sorting, filtering, pagination
  - Virtual scrolling for 10,000+ rows

#### Testing & Development
- **Vitest**: Unit and integration testing
- **Playwright**: E2E testing, PDF generation for fixtures
- **pdfkit/jsPDF**: Synthetic PDF generation for test cases
- **TypeScript**: Compile-time safety and refactoring confidence

### 2.2 Architecture Patterns

#### Local-First Principles
1. **Zero Server Dependencies**: All parsing, calculation, storage happens client-side
2. **Offline-First**: Full functionality without internet connection after initial load
3. **Privacy by Default**: No data leaves user's device
4. **Export Control**: Users can export raw SQLite file for backup/portability

#### Authentication & App Lock (MVP)
- **No accounts in MVP** (privacy-first, static export friendly)
- Optional **Local App Lock**:
  - User sets a PIN/passphrase locally
  - Use WebCrypto to derive a key and store a verifier (or encrypt exports)
  - Purpose: prevent casual access on shared machines (not a substitute for OS-level security)

#### “API” Organization (Static Export)
Because the MVP ships as a **static export**, there is no runtime server:
- Prefer a **library layer** over Next.js API routes:
  - `lib/db/queries/*` for reads
  - `lib/db/mutations/*` for writes/workflows (import, delete import, export, migrations)
  - `lib/parsing/*` for statement parsing + validation
- If a future hosted/sync mode is added, introduce `/api/v1/*` route handlers then.


#### Rendering Strategy
- **Marketing Pages (`/`)**: Static Site Generation (SSG)
  - Pre-rendered at build time for SEO and speed
  - Minimal JavaScript
- **App Pages (`/(app)/*`)**: Client-Side Rendering (CSR) by design
  - All persistence + analytics are **local-first** (OPFS + WASM SQLite + PDF parsing)
  - Browser-only APIs (File input, OPFS, WASM, pdf.js) make Server Components inappropriate for most app screens
  - Use **Client Components** for routes that touch the DB, parsing, charts, or tables

**Server Components vs Client Components (practical guidance)**:
- Use **Server Components** for:
  - Marketing routes, static content, docs pages
- Use **Client Components** for:
  - Upload/import workflows
  - Any view that queries SQLite (TanStack Query hooks)
  - Recharts / TanStack Table screens
  - Settings, export/import, and any OPFS interaction



#### Repository Structure

A feature-first structure keeps parsing/DB logic testable and prevents UI sprawl. Source lives under `src/`:

```text
/
├── src/
│   ├── app/
│   │   ├── globals.css              # Tailwind v4 imports + CSS variable theme
│   │   ├── (marketing)/             # SSG routes
│   │   └── (app)/                   # Client-rendered app routes
│   │       ├── dashboard/
│   │       ├── trades/
│   │       ├── analytics/
│   │       └── settings/
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components (generated into repo)
│   │   ├── layout/                  # AppShell, nav, page chrome
│   │   └── charts/                  # thin Recharts wrappers
│   ├── features/
│   │   ├── imports/                 # upload + preview + import error UX
│   │   ├── trades/                  # filters, table, export
│   │   ├── analytics/               # charts + selectors
│   │   ├── settings/
│   │   └── demo/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts            # wa-sqlite init + connection
│   │   │   ├── migrations/
│   │   │   └── queries/             # all SQL and query functions (domain-grouped)
│   │   ├── parsing/                 # versioned PDF parsers + registry
│   │   ├── calculations/            # FIFO, P&L, aggregates
│   │   ├── state/                   # TanStack Query client + zustand stores
│   │   └── utils/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── public/
│   └── sample-data/                 # demo fixtures
└── docs/
    └── parser-guides/
```

**Rules of the road**:
- UI never executes raw SQL directly; it calls `lib/db/queries/*`.
- Parsing logic has **zero React** and is heavily unit-tested.
- Feature screens live in `features/*` (composition/orchestration), while `components/*` stays reusable.


### 2.3 Data Flow Architecture

```
PDF Upload → pdf.js Extraction → Parser (versioned) → Validation
                                                           ↓
                                                      FIFO Matching
                                                           ↓
                                                   Section 5 Reconciliation
                                                           ↓
                                                      wa-sqlite (OPFS)
                                                           ↓
                                        TanStack Query (caching layer)
                                                           ↓
                                        React Components (Zustand for UI state)
```

---

## 3. PDF Parsing Strategy

### 3.1 Parser Architecture

#### Hybrid Parsing Approach
**Strategy**: Text anchors for section detection + relative column positions for data extraction

**Rationale**:
- Pure coordinate-based parsing is brittle to PDF format changes
- Pure text-based parsing struggles with tabular data alignment
- Hybrid approach balances robustness and precision

#### Parser Workflow
1. **Document Loading**: Load PDF via pdf.js, extract text + coordinates
2. **Section Detection**: Search for header text anchors
   - "Monthly Trade Confirmations" → Section 2
   - "Purchase and Sale" → Section 4
   - "Account Summary" → Section 10
3. **Column Position Calibration**: Once section found, detect column boundaries
   - Find first data row after header
   - Calculate relative X-positions for each column
   - Use percentage-based offsets (not absolute pixels)
4. **Row Extraction**: Iterate through section until next section header or page end
5. **Page Spanning**: Detect incomplete rows, merge across pages
6. **Data Normalization**: Convert to canonical format

### 3.2 Version Detection & Management

#### Version Detection Strategy
**Method**: Parse statement date, map to known format versions

**Version Mapping Table**:
```typescript
const STATEMENT_FORMAT_VERSIONS = {
  "2024-01-01": "v1.0",  // Initial Robinhood Derivatives format
  "2024-06-01": "v1.1",  // Added Section 11 (Tax Withholding)
  // Future versions mapped by effective date
} as const;

function detectStatementVersion(statementDate: Date): string {
  // Find most recent version <= statementDate
  const versions = Object.entries(STATEMENT_FORMAT_VERSIONS)
    .filter(([date]) => new Date(date) <= statementDate)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());

  return versions[0]?.[1] ?? "unknown";
}
```

#### Multi-Version Parser Architecture
```typescript
interface StatementParser {
  version: string;
  parse(pdf: PDFDocument): ParsedStatement;
  validate(result: ParsedStatement): ValidationResult;
}

class ParserRegistry {
  private parsers: Map<string, StatementParser>;

  getParser(version: string): StatementParser {
    return this.parsers.get(version) ?? this.parsers.get("v1.0");
  }
}
```

**Fallback Strategy**:
- If version detection fails, try all parsers in reverse chronological order
- First parser that successfully extracts all required sections wins
- Log version mismatches for manual review

### 3.3 Section Extraction Details

#### Section 2: Monthly Trade Confirmations
**Structure**: Multi-page table with headers
**Columns**: Date | Subtype (YES/NO) | Symbol | Price | Qty | Commission

**Extraction Challenges**:
- Symbol field can be very long (wraps to multiple lines)
- Table spans multiple pages with repeated headers
- Commission may be blank for some trades

**Parsing Logic**:
```typescript
interface TradeRow {
  date: string;
  side: "YES" | "NO";
  symbol: string;
  price: number;
  quantity: number;
  commission: number;
}

function parseSection2(sectionText: TextItem[]): TradeRow[] {
  // 1. Find "Monthly Trade Confirmations" header
  const sectionStart = findTextAnchor(sectionText, /Monthly Trade Confirmations/);

  // 2. Detect column positions from first data row
  const columnPositions = detectColumns(sectionText, sectionStart);

  // 3. Extract rows until next section or end of document
  const rows: TradeRow[] = [];
  let currentRow: Partial<TradeRow> = {};

  for (const item of sectionText.slice(sectionStart)) {
    // Check if this is a new section header
    if (isNewSection(item.text)) break;

    // Assign text to column based on X-position
    const column = getColumnForPosition(item.x, columnPositions);

    // Handle multi-line cells (e.g., wrapped symbols)
    if (column === "symbol" && currentRow.symbol) {
      currentRow.symbol += " " + item.text;
    } else {
      currentRow[column] = parseColumnValue(column, item.text);
    }

    // Row complete when all required fields present
    if (isRowComplete(currentRow)) {
      rows.push(currentRow as TradeRow);
      currentRow = {};
    }
  }

  return rows;
}
```

#### Section 5: Purchase and Sale Summary
**Purpose**: Provides aggregated Gross P&L per closed position

**Critical Insight**: This is the **source of truth** for P&L validation
- Individual trade P&L calculated via FIFO algorithm
- Sum must match Section 5 within ±$0.01 per position tolerance
- Discrepancies flagged but Robinhood's number is canonical

#### Symbol Parsing & Categorization
**Format**: `KXNFLGAME-25SEP04DALPHI-PHI`

**Parsing Logic**:
```typescript
const CATEGORY_PATTERNS = {
  NFL: /^KXNFL/,
  NBA: /^KXNBA/,
  Economics: /^KXFED|^KXCPI|^KXGDP/,
  Tennis: /^KXUSOMEN|^KXUSWOMEN/,
  Politics: /^KXELECTION|^KXPRESIDENT/,
  // Hardcoded patterns, manually updated
} as const;

function categorizeSymbol(symbol: string): string {
  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (pattern.test(symbol)) return category;
  }
  return "Uncategorized";
}
```

**Manual Update Process**: When new market categories emerge, update `CATEGORY_PATTERNS` and deploy new app version.

### 3.4 Error Handling & Validation

#### Parsing Failure Strategy
**Policy**: Reject entire import, show detailed error report

**Rationale**: Partial data is more dangerous than no data. Users might make decisions on incomplete information.

**Error Report Structure**:
```typescript
interface ParseError {
  section: string;
  status: "success" | "partial" | "failed";
  message?: string;
  rowsParsed?: number;
  rowsExpected?: number;
}

interface ParseResult {
  success: boolean;
  errors: ParseError[];
  warnings: string[];
}
```

**User-Facing Error UI**:
```
❌ Import Failed

Section Status:
✅ Section 1 (Header): Successfully parsed
✅ Section 2 (Trades): 147 trades extracted
❌ Section 5 (P&L Summary): Header not found
⚠️  Section 6 (Journal Entries): No deposits/withdrawals found (warning only)
✅ Section 10 (Account Summary): Net Liquidity extracted

Your statement could not be imported because Section 5 (required for P&L calculation) failed to parse.

Possible solutions:
- Ensure this is a valid Robinhood Derivatives monthly statement
- Try re-downloading the PDF from Robinhood
- Contact support if this error persists
```

---

## 4. Database Schema & Data Model

### 4.1 Canonical Data Model Philosophy

**Design Principle**: Universal schema with platform-specific extensions

**Core Fields** (present for all platforms):
- Trade identity (ID, date, symbol, side, quantity, price)
- Position tracking (entry/exit prices, realized P&L, fees)
- Trade lifecycle (type: OPEN/CLOSE/ADJUST)
- Attribution (platform ID, account ID, settlement date)

**Platform-Specific Extensions**:
- Stored as JSON blob in `platform_metadata` column
- Allows heterogeneous data (Kalshi ranged contracts, ForecastEx pools)
- Queryable via SQLite JSON functions if needed

### 4.2 Complete Schema Definition

```sql
-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Tracks each statement import
CREATE TABLE statement_imports (
    id TEXT PRIMARY KEY,                     -- UUID
    platform TEXT NOT NULL,                  -- "robinhood" | "kalshi" | "forecastex"
    account_number TEXT NOT NULL,
    statement_date DATE NOT NULL,
    statement_period_start DATE,
    statement_period_end DATE,
    parser_version TEXT NOT NULL,            -- e.g., "v1.0"
    import_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    pdf_stored_until DATE,                   -- Purge date (12 months from import)
    net_liquidity DECIMAL(10, 2),            -- From Section 10
    total_fees DECIMAL(10, 2),
    ending_cash DECIMAL(10, 2),

    UNIQUE(platform, account_number, statement_date)
);

-- Individual trades (atomic units from Section 2)
CREATE TABLE trades (
    id TEXT PRIMARY KEY,                     -- UUID
    import_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    account_id TEXT NOT NULL,

    -- Trade identity
    trade_date DATE NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT CHECK(side IN ('YES', 'NO', 'LONG', 'SHORT')),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 4) NOT NULL,           -- Per-contract price

    -- Costs
    fees DECIMAL(10, 2) DEFAULT 0,           -- Commission + exchange fees

    -- Trade type
    trade_type TEXT CHECK(trade_type IN ('OPEN', 'CLOSE', 'ADJUST')),

    -- Categorization
    category TEXT,                           -- Auto-tagged from symbol

    -- Settlement
    settlement_date DATE,
    settlement_price DECIMAL(10, 4),         -- Decimal, not binary (0-1 range)

    -- Platform-specific data
    platform_metadata JSON,

    FOREIGN KEY (import_id) REFERENCES statement_imports(id) ON DELETE CASCADE
);

-- Closed positions with P&L (from Section 5, aggregated view)
CREATE TABLE closed_positions (
    id TEXT PRIMARY KEY,
    import_id TEXT NOT NULL,
    platform TEXT NOT NULL,

    symbol TEXT NOT NULL,
    entry_date DATE,
    exit_date DATE,
    entry_price DECIMAL(10, 4),
    exit_price DECIMAL(10, 4),
    quantity INTEGER,

    -- P&L (source of truth from statement)
    gross_pnl DECIMAL(10, 2) NOT NULL,       -- From Section 5
    fees DECIMAL(10, 2),
    net_pnl DECIMAL(10, 2),                  -- gross_pnl - fees

    -- Validation
    calculated_pnl DECIMAL(10, 2),           -- Our FIFO calculation
    pnl_discrepancy DECIMAL(10, 2),          -- gross_pnl - calculated_pnl

    FOREIGN KEY (import_id) REFERENCES statement_imports(id) ON DELETE CASCADE
);

-- Cash flows (deposits/withdrawals from Section 6)
CREATE TABLE cash_flows (
    id TEXT PRIMARY KEY,
    import_id TEXT NOT NULL,

    date DATE NOT NULL,
    type TEXT CHECK(type IN ('DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'FEE', 'ADJUSTMENT')),
    amount DECIMAL(10, 2) NOT NULL,          -- Positive for deposits, negative for withdrawals
    description TEXT,

    FOREIGN KEY (import_id) REFERENCES statement_imports(id) ON DELETE CASCADE
);

-- Open positions (from Section 7)
CREATE TABLE open_positions (
    id TEXT PRIMARY KEY,
    import_id TEXT NOT NULL,
    snapshot_date DATE NOT NULL,             -- Statement date

    symbol TEXT NOT NULL,
    side TEXT,
    quantity INTEGER,
    cost_basis DECIMAL(10, 4),               -- Average entry price
    current_price DECIMAL(10, 4),            -- Last known market price
    market_value DECIMAL(10, 2),
    unrealized_pnl DECIMAL(10, 2),

    FOREIGN KEY (import_id) REFERENCES statement_imports(id) ON DELETE CASCADE
);

-- ============================================================================
-- METADATA & CONFIGURATION
-- ============================================================================

-- Database version for migrations
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description)
VALUES (1, 'Initial schema with multi-platform support');

-- User preferences
CREATE TABLE user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO user_settings (key, value) VALUES
    ('theme', 'dark'),
    ('default_view', 'dashboard'),
    ('date_format', 'MM/DD/YYYY'),
    ('pdf_retention_months', '12');

-- Duplicate detection tracking
CREATE TABLE import_duplicates (
    id TEXT PRIMARY KEY,
    original_import_id TEXT NOT NULL,
    duplicate_import_id TEXT NOT NULL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_action TEXT CHECK(user_action IN ('KEEP_BOTH', 'REPLACE', 'PENDING')),

    FOREIGN KEY (original_import_id) REFERENCES statement_imports(id),
    FOREIGN KEY (duplicate_import_id) REFERENCES statement_imports(id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Trade queries by date, category, symbol
CREATE INDEX idx_trades_date ON trades(trade_date);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_category ON trades(category);
CREATE INDEX idx_trades_import ON trades(import_id);

-- Closed positions for P&L queries
CREATE INDEX idx_closed_positions_date ON closed_positions(exit_date);
CREATE INDEX idx_closed_positions_symbol ON closed_positions(symbol);

-- Cash flows for bankroll calculation
CREATE INDEX idx_cash_flows_date ON cash_flows(date);
CREATE INDEX idx_cash_flows_type ON cash_flows(type);

-- Open positions for current portfolio view
CREATE INDEX idx_open_positions_snapshot ON open_positions(snapshot_date);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Monthly performance summary
CREATE VIEW monthly_performance AS
SELECT
    strftime('%Y-%m', exit_date) as month,
    COUNT(*) as trades_closed,
    SUM(gross_pnl) as gross_pnl,
    SUM(fees) as total_fees,
    SUM(net_pnl) as net_pnl,
    AVG(net_pnl) as avg_pnl_per_trade,
    SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
    CAST(SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as win_rate
FROM closed_positions
GROUP BY month
ORDER BY month DESC;

-- Category performance comparison
CREATE VIEW category_performance AS
SELECT
    t.category,
    COUNT(DISTINCT cp.id) as positions_closed,
    SUM(cp.gross_pnl) as gross_pnl,
    SUM(cp.fees) as total_fees,
    SUM(cp.net_pnl) as net_pnl,
    AVG(cp.net_pnl) as avg_pnl_per_position,
    SUM(CASE WHEN cp.net_pnl > 0 THEN 1 ELSE 0 END) as winning_positions,
    CAST(SUM(CASE WHEN cp.net_pnl > 0 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as win_rate_by_count,
    SUM(CASE WHEN cp.net_pnl > 0 THEN ABS(cp.net_pnl) ELSE 0 END) as winning_dollar_volume,
    SUM(ABS(cp.net_pnl)) as total_dollar_volume,
    SUM(CASE WHEN cp.net_pnl > 0 THEN ABS(cp.net_pnl) ELSE 0 END) / SUM(ABS(cp.net_pnl)) as win_rate_by_volume
FROM closed_positions cp
JOIN trades t ON t.symbol = cp.symbol AND t.import_id = cp.import_id
GROUP BY t.category;

-- Current portfolio health
CREATE VIEW portfolio_snapshot AS
SELECT
    (SELECT SUM(amount) FROM cash_flows WHERE type = 'DEPOSIT') as total_deposits,
    (SELECT SUM(amount) FROM cash_flows WHERE type = 'WITHDRAWAL') as total_withdrawals,
    (SELECT SUM(net_pnl) FROM closed_positions) as realized_pnl,
    (SELECT SUM(unrealized_pnl) FROM open_positions WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM open_positions)) as unrealized_pnl,
    (SELECT net_liquidity FROM statement_imports ORDER BY statement_date DESC LIMIT 1) as current_net_liquidity;
```

### 4.3 Migration Framework

#### Migration Strategy
**Approach**: User-prompted migrations with automatic backup

**Migration Workflow**:
1. User opens app after update
2. Detect schema version mismatch
3. Show modal: "Database upgrade required. Your data will be backed up before upgrading. Continue?"
4. On confirm:
   - Export current DB to OPFS as `backup-{timestamp}.db`
   - Run migration SQL in transaction
   - Update `schema_version` table
   - Verify migration success
   - On failure: restore from backup, show error

**Migration File Structure**:
```typescript
// lib/db/migrations/001_add_platform_support.ts
export const migration_001 = {
  version: 2,
  description: "Add multi-platform support",

  up: async (db: Database) => {
    await db.exec(`
      ALTER TABLE trades ADD COLUMN platform TEXT DEFAULT 'robinhood';
      ALTER TABLE trades ADD COLUMN platform_metadata JSON;
      CREATE INDEX idx_trades_platform ON trades(platform);
    `);
  },

  down: async (db: Database) => {
    // Rollback logic (best effort)
    await db.exec(`
      ALTER TABLE trades DROP COLUMN platform;
      ALTER TABLE trades DROP COLUMN platform_metadata;
    `);
  }
};
```

**Migration Runner**:
```typescript
async function runMigrations(db: Database) {
  const currentVersion = await getCurrentVersion(db);
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);

  if (pendingMigrations.length === 0) return;

  // Create backup before migrations
  await backupDatabase(db);

  for (const migration of pendingMigrations) {
    try {
      await db.exec("BEGIN TRANSACTION");
      await migration.up(db);
      await db.exec(`INSERT INTO schema_version (version, description) VALUES (?, ?)`,
        [migration.version, migration.description]);
      await db.exec("COMMIT");
    } catch (error) {
      await db.exec("ROLLBACK");
      await restoreFromBackup(db);
      throw new Error(`Migration ${migration.version} failed: ${error.message}`);
    }
  }
}
```

---

## 5. Core Features & User Flows

### 5.1 Feature Overview

#### MVP Features (4-6 Week Timeline)
1. **PDF Upload & Parsing**: Multi-statement ingestion with validation
2. **Portfolio Dashboard**: Net Liquidity, P&L, Win Rate tiles
3. **Trade Journal**: Sortable/filterable table of all trades
4. **Performance Analytics**: Category-based comparison charts
5. **Cash Flow Tracking**: Deposits vs. Trading Profit separation
6. **Demo Mode**: Interactive onboarding with sample data

#### Post-MVP Features (Future Roadmap)
- Time-weighted return (TWR) calculations
- Sharpe ratio and risk-adjusted metrics
- Tax reporting exports
- Multi-account aggregation
- Live price integration (optional API)
- Custom tagging and notes

### 5.2 Upload Flow

#### User Journey
```
1. User clicks "Upload Statement" button
   ↓
2. File picker opens (accept=".pdf")
   ↓
3. PDF validation:
   - Check file size (<50MB)
   - Check file type (application/pdf)
   - Check page count (<100 pages)
   ↓
4. Parser detects version and extracts data
   ↓
5a. SUCCESS: Show preview summary
    - "147 trades found"
    - "Net Liquidity: $5,432.10"
    - "Statement period: Jan 1-31, 2024"
    - "Import" button
    ↓
5b. FAILURE: Show detailed error report
    - Section-by-section status
    - Suggested fixes
    - "Try Again" button
    ↓
6. Duplicate detection
   ↓
7a. NO DUPLICATE: Proceed to import
    ↓
7b. DUPLICATE FOUND: Show modal
    "Statement for Jan 2024 already exists. Replace or Keep Both?"
    - Replace: Delete old import, insert new
    - Keep Both: Insert with suffix "_amended"
    ↓
8. Import to database (transaction)
   ↓
9. FIFO matching and P&L validation
   ↓
10a. VALIDATION SUCCESS: Navigate to dashboard
     ↓
10b. VALIDATION WARNING: Show discrepancies
     "Calculated P&L: $123.45, Statement P&L: $123.50 (±$0.05)"
     "Continue anyway" button
```

#### Upload Component Implementation
```typescript
function UploadFlow() {
  const [uploadState, setUploadState] = useState<"idle" | "parsing" | "preview" | "error">("idle");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  async function handleFileUpload(file: File) {
    setUploadState("parsing");

    try {
      // Load PDF
      const pdfDoc = await loadPDF(file);

      // Detect version
      const version = detectStatementVersion(pdfDoc);
      const parser = getParser(version);

      // Parse
      const result = await parser.parse(pdfDoc);

      // Validate
      const validation = await parser.validate(result);

      if (!validation.success) {
        setUploadState("error");
        setParseResult({ errors: validation.errors });
        return;
      }

      // Check for duplicates
      const duplicate = await checkDuplicate(result.statement_date, result.account_number);
      if (duplicate) {
        const action = await showDuplicateModal(duplicate);
        if (action === "cancel") return;
      }

      setUploadState("preview");
      setParseResult(result);

    } catch (error) {
      setUploadState("error");
      setParseResult({ errors: [{ section: "General", message: error.message }] });
    }
  }

  // Render based on state...
}
```

### 5.3 Dashboard Features

#### Portfolio Overview Tiles
**Layout**: 4-column responsive grid (4 → 2 → 1 column on mobile)

**Tiles**:
1. **Net Liquidity** (Primary KPI)
   - Current net liquidity from latest statement
   - Sparkline showing last 6 months trend
   - Tooltip: "Your total account value including open positions"

2. **Realized P&L**
   - Sum of all closed position net P&L
   - Win rate (count-based) as secondary metric
   - Tooltip: "Profit/loss from closed trades only"

3. **Unrealized P&L**
   - Sum from latest open_positions snapshot
   - Badge: "As of [statement date]" (staleness indicator)
   - Tooltip: "Estimated profit/loss on open positions (prices may be outdated)"

4. **Total Fees**
   - Sum of all fees from trades and cash flows
   - Fee drag %: `(fees / total_volume) * 100`
   - Tooltip: "Commission + exchange fees paid"

5. **Trading Profit**
   - Calculated: `Net Liquidity - (Total Deposits - Total Withdrawals)`
   - Simple arithmetic (MVP, no time-weighting)
   - Tooltip: "Your actual trading performance excluding cash injections"

6. **Win Rate (Dual Metric)**
   - Primary: Count-based percentage `(winning_trades / total_trades) * 100`
   - Secondary: Volume-weighted percentage `(winning_$ / total_$) * 100`
   - Toggle between metrics on click
   - Tooltip explains difference

#### Time-Series Chart
**Chart Type**: Line chart (Recharts LineChart)
**Data**: Monthly snapshots of Net Liquidity
**Handling Gaps**: Null values with "No data" tooltip
**X-Axis**: Month labels (MMM YYYY)
**Y-Axis**: Dollar amounts with k/M abbreviations
**Interaction**: Hover shows exact date + value

### 5.4 Trade Journal

#### Table Features
**Library**: TanStack Table v8

**Columns**:
- Date (sortable, default sort DESC)
- Symbol (clickable to filter)
- Side (YES/NO badge with color)
- Quantity
- Entry Price
- Exit Price (if closed)
- P&L (color-coded: green positive, red negative)
- Fees
- Category (pill badge, clickable to filter)
- Status (Open/Closed)

**Filters** (AND/OR composition):
```typescript
interface FilterState {
  dateRange?: { start: Date; end: Date };
  categories?: string[];
  symbols?: string[];
  minPnl?: number;
  maxPnl?: number;
  status?: "OPEN" | "CLOSED" | "ALL";

  // Composition
  logic: "AND" | "OR";
}

// Filter builder UI
<FilterBuilder>
  <FilterGroup logic="AND">
    <DateRangeFilter />
    <CategoryFilter options={uniqueCategories} />
    <PnLRangeFilter />
  </FilterGroup>
  <Button onClick={addOrGroup}>+ Add OR Group</Button>
</FilterBuilder>
```

**Pagination**: 50 rows per page
**Virtual Scrolling**: Enabled for >1000 rows
**Export**: "Export to CSV" button (filtered results)

### 5.5 Analytics Views

#### Category Performance Comparison
**Chart Type**: Horizontal bar chart
**Data**: Net P&L by category (from `category_performance` view)
**Sorting**: By P&L descending
**Interaction**: Click bar to drill down to trade list filtered by category

#### Volume Distribution Treemap
**Chart Type**: Recharts Treemap
**Data**: Total dollar volume by category
**Size**: Proportional to `SUM(ABS(quantity * price))`
**Color**: Green for net positive categories, red for net negative
**Labels**: Category name + volume

#### Fee Analysis
**Chart Type**: Stacked bar chart (monthly)
**Data**: Commission vs. Exchange Fees by month
**Cumulative Line**: Running total of fees paid
**Insight**: "Your fees have increased 15% over last 3 months"

### 5.6 Demo Mode

#### Demo Data Strategy
**Approach**: Manually curate ~50 trades showing key scenarios

**Narrative Scenarios**:
1. Profitable NFL betting ($500 profit over 20 trades)
2. Losing streak in Economics category (-$200 over 8 trades)
3. Mixed Tennis results (break-even with high volume)
4. Single big win in Politics ($300 on one trade)
5. Fee drag example (many small trades eating into profits)

**Data Generation**:
```typescript
const DEMO_TRADES = [
  {
    date: "2024-01-05",
    symbol: "KXNFLGAME-BUFKC-BUF",
    side: "YES",
    quantity: 100,
    price: 0.65,
    settlement: 1.00,
    category: "NFL",
  },
  // ... 49 more curated trades
];

function generateDemoDatabase() {
  const db = initDatabase(":memory:");

  // Insert demo statement
  db.run(`INSERT INTO statement_imports VALUES (...)`);

  // Insert trades
  for (const trade of DEMO_TRADES) {
    db.run(`INSERT INTO trades VALUES (...)`);
  }

  // Calculate closed positions
  const closedPositions = calculateFIFO(DEMO_TRADES);
  for (const position of closedPositions) {
    db.run(`INSERT INTO closed_positions VALUES (...)`);
  }

  return db;
}
```

**Demo Transition**:
- On first real PDF upload, show confirmation modal
- "This will replace demo data with your real trading data. Continue?"
- On confirm, wipe demo database, import real statement
- No way to return to demo mode (must refresh page before first upload)

---

## 6. UI/UX Design System

### 6.1 Visual Identity: "Dark Monarch"

**Implementation note (Tailwind v4 + shadcn/ui)**:
- Treat **CSS variables** in `src/app/globals.css` as the single source of truth for theme tokens.
- Keep the palette in variables like `--background`, `--foreground`, `--primary`, etc.
- Tailwind v4 customization lives in CSS (`@theme { ... }`), not in `tailwind.config.*` (unless you deliberately opt in).


**Brand Attributes**:
- Professional yet approachable
- Data-dense without overwhelming
- Dark theme optimized for trading environments
- Accessible color contrast (WCAG AA minimum)

**Color Palette**:
```typescript
const colors = {
  // Background
  bg: {
    primary: "hsl(224, 71%, 4%)",      // Near-black blue
    secondary: "hsl(220, 13%, 13%)",   // Charcoal
    tertiary: "hsl(217, 19%, 20%)",    // Lighter gray
  },

  // Foreground
  fg: {
    primary: "hsl(210, 40%, 98%)",     // Off-white
    secondary: "hsl(215, 20%, 65%)",   // Muted gray
    muted: "hsl(215, 16%, 47%)",       // Dim text
  },

  // Semantic
  success: "hsl(142, 72%, 29%)",       // Green (4.5:1 contrast on dark bg)
  error: "hsl(0, 84%, 60%)",           // Red (4.5:1 contrast)
  warning: "hsl(38, 92%, 50%)",        // Amber
  info: "hsl(199, 89%, 48%)",          // Blue

  // Chart-specific (colorblind-safe)
  chart: {
    primary: "hsl(221, 83%, 53%)",     // Blue
    secondary: "hsl(142, 72%, 29%)",   // Green
    tertiary: "hsl(262, 83%, 58%)",    // Purple
    quaternary: "hsl(38, 92%, 50%)",   // Amber
  },

  // P&L colors (NOT red/green for colorblind users)
  pnl: {
    positive: colors.success,          // Sufficient contrast
    negative: colors.error,            // Sufficient contrast
    neutral: colors.fg.muted,
  },
};
```

**Typography**:
- **Font Stack**: `"Inter", system-ui, sans-serif`
- **Scale**: Tailwind default (text-xs to text-4xl)
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Line Height**: Relaxed for readability (leading-relaxed)

**Spacing**: Tailwind 4px base scale
**Radius**: `rounded-lg` (8px) for tiles, `rounded-md` (6px) for buttons

### 6.2 Component Library (Shadcn UI)

**Core Components**:
- Button (variants: default, outline, ghost, destructive)
- Card (for dashboard tiles)
- Table (with sorting, filtering, pagination)
- Dialog (for modals, confirmations)
- Tooltip (for explanatory text)
- Badge (for categories, status)
- Input (file upload, filters)
- Select (dropdowns)
- Tabs (navigation)
- Progress (upload status)

**Custom Components**:
```typescript
// Dashboard Tile
<Tile>
  <TileHeader>
    <TileTitle>Net Liquidity</TileTitle>
    <TileTooltip>Your total account value...</TileTooltip>
  </TileHeader>
  <TileValue>$5,432.10</TileValue>
  <TileSparkline data={monthlyData} />
  <TileTrend>+12.5% this month</TileTrend>
</Tile>

// P&L Badge
<PnLBadge value={123.45} />
// Renders: <Badge className="bg-success">+$123.45</Badge>

// Category Pill
<CategoryPill category="NFL" onClick={handleFilter} />
```

### 6.3 Responsive Design

**Breakpoints** (Tailwind defaults):
- **Mobile**: <640px (1-column layout)
- **Tablet**: 640-1024px (2-column layout)
- **Desktop**: >1024px (4-column layout)

**Responsive Strategy**: Simple stacking, no redesign
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {tiles.map(tile => <Tile key={tile.id} {...tile} />)}
</div>
```

**Mobile Considerations**:
- Charts: Reduce data points on mobile (daily → weekly aggregation)
- Tables: Horizontal scroll with sticky first column
- Filters: Collapsible filter panel (drawer on mobile)
- Upload: Large touch-friendly button

### 6.4 Accessibility

**WCAG AA Compliance**:
- ✅ Color contrast ≥4.5:1 for text
- ✅ Color contrast ≥3:1 for UI components
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Screen reader labels (aria-label, aria-describedby)
- ✅ Focus indicators (ring-2 ring-offset-2)

**Semantic HTML**:
```tsx
<main role="main">
  <h1>Dashboard</h1>
  <section aria-labelledby="portfolio-overview">
    <h2 id="portfolio-overview">Portfolio Overview</h2>
    {/* Tiles */}
  </section>

  <section aria-labelledby="trade-journal">
    <h2 id="trade-journal">Trade Journal</h2>
    <table role="table">
      {/* Table content */}
    </table>
  </section>
</main>
```

**Tooltip Implementation**:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="What is Net Liquidity?">
        <InfoIcon className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Your total account value including cash and open positions</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## 7. Performance & Optimization

### 7.1 Performance Budget

**Target**: <2 seconds for all user interactions
**Acceptable**: Loading states for complex queries (with progress indicator)

**Budget Breakdown**:
- PDF parsing: <5s for 15-page statement
- Database query: <500ms for aggregations
- Data transformation: <200ms (SQL → Recharts format)
- Chart render: <300ms for 1000 data points
- Total page load: <2s (subsequent visits, with cache)

### 7.2 Optimization Strategy

#### Primary Bottleneck: SQLite Query Time
**Solution**: Indexes and query optimization

**Index Strategy**:
```sql
-- Covering index for dashboard queries
CREATE INDEX idx_closed_positions_dashboard
ON closed_positions(exit_date, net_pnl, fees);

-- Composite index for filtered trade journal
CREATE INDEX idx_trades_journal
ON trades(trade_date DESC, category, symbol);
```

**Query Optimization**:
```typescript
// BAD: Separate queries in loop
for (const category of categories) {
  const pnl = db.get(`SELECT SUM(net_pnl) FROM closed_positions
                       JOIN trades ON ... WHERE category = ?`, [category]);
}

// GOOD: Single query with GROUP BY
const results = db.all(`
  SELECT category, SUM(net_pnl) as total_pnl
  FROM closed_positions cp
  JOIN trades t ON t.symbol = cp.symbol
  GROUP BY category
`);
```

**Materialized Views** (computed on import):
```typescript
// After import, pre-calculate common aggregations
await db.exec(`
  INSERT INTO monthly_aggregates (month, metric, value)
  SELECT
    strftime('%Y-%m', exit_date) as month,
    'net_pnl',
    SUM(net_pnl)
  FROM closed_positions
  GROUP BY month
`);
```

#### Secondary Bottleneck: Data Transformation
**Solution**: Memoization with React Query

```typescript
const { data: chartData } = useQuery({
  queryKey: ["monthly-pnl", dateRange],
  queryFn: async () => {
    const rows = await db.all(`SELECT month, net_pnl FROM monthly_performance`);

    // Transform for Recharts
    return rows.map(row => ({
      month: row.month,
      value: row.net_pnl,
    }));
  },
  staleTime: 60_000, // Cache for 1 minute
  gcTime: 300_000,   // Keep in cache for 5 minutes
});
```

#### Chart Performance
**Strategy**: Data reduction for large datasets

```typescript
function reduceDataPoints(data: DataPoint[], maxPoints: number = 100): DataPoint[] {
  if (data.length <= maxPoints) return data;

  // Sample every Nth point
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}

// Usage
<LineChart data={reduceDataPoints(dailyData, 100)} />
```

### 7.3 Code Splitting

**Route-based splitting** (Next.js automatic):
```typescript
// app/app/dashboard/page.tsx → separate chunk
// app/app/trades/page.tsx → separate chunk
```

**Component-level splitting**:
```typescript
const AnalyticsPage = dynamic(() => import("@/components/analytics"), {
  loading: () => <Skeleton />,
  ssr: false, // Client-side only
});
```

**Chart library splitting**:
```typescript
// Only load Recharts on routes that need it
const ChartComponent = dynamic(() => import("@/components/chart"), {
  loading: () => <Spinner />,
});
```

### 7.4 OPFS Performance

**Connection Pooling**:
```typescript
class DatabasePool {
  private connection: Database | null = null;

  async getConnection(): Promise<Database> {
    if (!this.connection) {
      this.connection = await initWASQLite();
    }
    return this.connection;
  }

  // Reuse connection across queries
}

const dbPool = new DatabasePool();
```

**Batch Operations**:
```typescript
// BAD: Individual inserts
for (const trade of trades) {
  await db.run(`INSERT INTO trades VALUES (...)`, trade);
}

// GOOD: Single transaction with prepared statement
const stmt = await db.prepare(`INSERT INTO trades VALUES (?, ?, ?...)`);
await db.exec("BEGIN TRANSACTION");
for (const trade of trades) {
  await stmt.run(...Object.values(trade));
}
await db.exec("COMMIT");
await stmt.finalize();
```

---

## 8. Error Handling & Edge Cases

### 8.1 Parsing Error Scenarios

#### Section-Specific Failures

**Section 2 (Trades) Missing**:
- **Impact**: CRITICAL - no trade data
- **Action**: Reject import
- **Message**: "Trade data could not be extracted. This section is required."

**Section 5 (P&L Summary) Missing**:
- **Impact**: CRITICAL - cannot validate P&L
- **Action**: Reject import
- **Message**: "P&L summary not found. Cannot verify trade profitability."

**Section 6 (Journal Entries) Empty**:
- **Impact**: WARNING - no cash flows
- **Action**: Allow import with warning
- **Message**: "No deposits or withdrawals found. Cash flow analysis unavailable."

**Section 10 (Account Summary) Missing**:
- **Impact**: CRITICAL - no net liquidity
- **Action**: Reject import
- **Message**: "Account summary not found. Cannot determine portfolio value."

#### Malformed Data

**Invalid Dates**:
```typescript
function parseDate(dateStr: string): Date | null {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    throw new ParseError(`Invalid date: ${dateStr}`);
  }
  if (parsed.getFullYear() < 2020 || parsed.getFullYear() > 2030) {
    throw new ParseError(`Date out of range: ${dateStr}`);
  }
  return parsed;
}
```

**Invalid Numbers**:
```typescript
function parseDecimal(numStr: string): number | null {
  const cleaned = numStr.replace(/[$,\s]/g, "");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    throw new ParseError(`Invalid number: ${numStr}`);
  }
  return parsed;
}
```

**Unexpected Symbol Format**:
```typescript
function parseSymbol(symbol: string): { exchange: string; contract: string } {
  const match = symbol.match(/^([A-Z]+)(.+)$/);
  if (!match) {
    console.warn(`Unexpected symbol format: ${symbol}`);
    return { exchange: "UNKNOWN", contract: symbol };
  }
  return { exchange: match[1], contract: match[2] };
}
```

### 8.2 Data Validation & Reconciliation

#### FIFO Matching Algorithm
```typescript
interface Position {
  symbol: string;
  quantity: number;
  entryPrice: number;
  entryDate: Date;
}

function calculateFIFO(trades: Trade[]): ClosedPosition[] {
  const positions: Map<string, Position[]> = new Map();
  const closedPositions: ClosedPosition[] = [];

  for (const trade of trades) {
    const openPositions = positions.get(trade.symbol) ?? [];

    if (trade.side === "YES") {
      // Opening position
      openPositions.push({
        symbol: trade.symbol,
        quantity: trade.quantity,
        entryPrice: trade.price,
        entryDate: trade.date,
      });
    } else {
      // Closing position (FIFO)
      let remainingQty = trade.quantity;

      while (remainingQty > 0 && openPositions.length > 0) {
        const oldest = openPositions[0];
        const matchQty = Math.min(remainingQty, oldest.quantity);

        closedPositions.push({
          symbol: trade.symbol,
          entryDate: oldest.entryDate,
          exitDate: trade.date,
          entryPrice: oldest.entryPrice,
          exitPrice: trade.price,
          quantity: matchQty,
          calculatedPnl: matchQty * (trade.price - oldest.entryPrice),
        });

        oldest.quantity -= matchQty;
        remainingQty -= matchQty;

        if (oldest.quantity === 0) {
          openPositions.shift();
        }
      }

      if (remainingQty > 0) {
        console.warn(`Closed ${remainingQty} contracts without matching open position`);
      }
    }

    positions.set(trade.symbol, openPositions);
  }

  return closedPositions;
}
```

#### P&L Validation
```typescript
function validatePnL(
  calculated: ClosedPosition[],
  reported: SectionFiveData[]
): ValidationResult {
  const errors: string[] = [];
  const tolerance = 0.01; // ±$0.01 per position

  for (const reportedPos of reported) {
    const matchingCalculated = calculated.filter(
      cp => cp.symbol === reportedPos.symbol &&
            isSameDay(cp.exitDate, reportedPos.exitDate)
    );

    const calcTotal = matchingCalculated.reduce((sum, cp) => sum + cp.calculatedPnl, 0);
    const discrepancy = Math.abs(calcTotal - reportedPos.grossPnl);

    if (discrepancy > tolerance) {
      errors.push(
        `${reportedPos.symbol}: Calculated $${calcTotal.toFixed(2)}, ` +
        `Statement shows $${reportedPos.grossPnl.toFixed(2)} ` +
        `(Δ $${discrepancy.toFixed(2)})`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    // Store discrepancies in database for transparency
  };
}
```

### 8.3 Settlement Edge Cases

#### Partial Settlements
**Example**: Market settles at 42¢ instead of 0¢ or 100¢

**Handling**: Settlement price stored as decimal (0.00 to 1.00 range)
```typescript
interface ClosedPosition {
  entryPrice: number;    // e.g., 0.65
  exitPrice: number;     // e.g., 0.42 (partial settlement)
  quantity: number;      // e.g., 100
  pnl: number;          // 100 * (0.42 - 0.65) = -$23.00
}
```

**UI Display**:
```typescript
<Badge variant={getPnLVariant(position.pnl)}>
  {position.exitPrice < 1.0 && position.exitPrice > 0 && (
    <Tooltip content="Partial settlement">
      <WarningIcon />
    </Tooltip>
  )}
  {formatCurrency(position.pnl)}
</Badge>
```

#### Voided Markets
**Detection**: Settlement price exactly 0.00 with no movement
**Handling**: Flag as voided, exclude from win rate calculations
```typescript
function isVoidedMarket(position: ClosedPosition): boolean {
  return position.exitPrice === position.entryPrice &&
         position.pnl === 0 &&
         position.fees === 0;
}
```

### 8.4 Browser Compatibility Issues

#### OPFS Not Supported (Non-Chromium)
```typescript
async function checkBrowserSupport(): Promise<boolean> {
  if (!("storage" in navigator && "getDirectory" in navigator.storage)) {
    showErrorModal({
      title: "Browser Not Supported",
      message: "This app requires Chrome, Edge, or Brave browser. " +
               "Firefox and Safari are not currently supported.",
      action: "Download Chrome",
      actionUrl: "https://www.google.com/chrome/",
    });
    return false;
  }
  return true;
}
```

#### Storage Quota Exceeded
```typescript
async function checkStorageQuota(): Promise<void> {
  const estimate = await navigator.storage.estimate();
  const usagePercent = (estimate.usage! / estimate.quota!) * 100;

  if (usagePercent > 80) {
    showWarning({
      message: `Storage ${usagePercent.toFixed(0)}% full. ` +
               `Consider deleting old statements or exports.`,
      action: "Manage Storage",
    });
  }

  if (usagePercent > 95) {
    throw new Error("Storage quota exceeded. Free up space to continue.");
  }
}
```

### 8.5 Data Consistency Guards

#### Transaction Wrapping
```typescript
async function importStatement(data: ParsedStatement): Promise<void> {
  const db = await dbPool.getConnection();

  try {
    await db.exec("BEGIN TRANSACTION");

    // 1. Insert statement
    await db.run(`INSERT INTO statement_imports VALUES (...)`, data.header);

    // 2. Insert trades
    for (const trade of data.trades) {
      await db.run(`INSERT INTO trades VALUES (...)`, trade);
    }

    // 3. Insert closed positions
    for (const position of data.closedPositions) {
      await db.run(`INSERT INTO closed_positions VALUES (...)`, position);
    }

    // 4. Validate referential integrity
    const orphanedTrades = await db.get(`
      SELECT COUNT(*) FROM trades WHERE import_id NOT IN (SELECT id FROM statement_imports)
    `);
    if (orphanedTrades.count > 0) {
      throw new Error("Referential integrity violation");
    }

    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
```

---

## 9. Testing Strategy

### 9.1 Test Coverage Goals

**Targets**:
- Unit tests: ≥80% coverage
- Integration tests: Critical paths (upload, calculation, rendering)
- E2E tests: Happy path + error scenarios

### 9.2 Unit Testing

#### Parser Logic Tests
```typescript
import { describe, it, expect } from "vitest";
import { parseSection2 } from "@/lib/parsers/section2";

describe("Section 2 Parser", () => {
  it("should extract trades from valid section", () => {
    const mockSection = createMockSection2Data();
    const trades = parseSection2(mockSection);

    expect(trades).toHaveLength(147);
    expect(trades[0]).toMatchObject({
      date: "2024-01-05",
      symbol: "KXNFLGAME-BUFKC-BUF",
      side: "YES",
      quantity: 100,
      price: 0.65,
    });
  });

  it("should handle wrapped symbol names", () => {
    const mockSection = createMockSectionWithWrappedSymbol();
    const trades = parseSection2(mockSection);

    expect(trades[0].symbol).toBe("KXVERYLONGSYMBOLNAME-WRAPPED");
  });

  it("should throw on missing header", () => {
    const mockSection = createMockSectionWithoutHeader();

    expect(() => parseSection2(mockSection)).toThrow("Section 2 header not found");
  });
});
```

#### FIFO Calculation Tests
```typescript
describe("FIFO Matching", () => {
  it("should match FIFO for simple buy-sell", () => {
    const trades = [
      { date: "2024-01-01", side: "YES", quantity: 100, price: 0.50 },
      { date: "2024-01-02", side: "NO", quantity: 100, price: 0.75 },
    ];

    const positions = calculateFIFO(trades);

    expect(positions).toHaveLength(1);
    expect(positions[0].calculatedPnl).toBe(25.00); // 100 * (0.75 - 0.50)
  });

  it("should handle partial fills with FIFO", () => {
    const trades = [
      { date: "2024-01-01", side: "YES", quantity: 100, price: 0.50 },
      { date: "2024-01-02", side: "YES", quantity: 50, price: 0.60 },
      { date: "2024-01-03", side: "NO", quantity: 120, price: 0.70 },
    ];

    const positions = calculateFIFO(trades);

    expect(positions).toHaveLength(2);
    expect(positions[0].quantity).toBe(100); // First position fully closed
    expect(positions[1].quantity).toBe(20);  // Partial close of second
  });
});
```

### 9.3 Integration Testing

#### Database Operations
```typescript
import { beforeEach, describe, it } from "vitest";
import { initDatabase, importStatement } from "@/lib/db";

describe("Statement Import", () => {
  let db: Database;

  beforeEach(async () => {
    db = await initDatabase(":memory:");
  });

  it("should import statement and validate referential integrity", async () => {
    const mockStatement = createMockParsedStatement();

    await importStatement(db, mockStatement);

    const imports = await db.all("SELECT * FROM statement_imports");
    expect(imports).toHaveLength(1);

    const trades = await db.all("SELECT * FROM trades");
    expect(trades).toHaveLength(mockStatement.trades.length);

    // Verify foreign keys
    for (const trade of trades) {
      expect(trade.import_id).toBe(imports[0].id);
    }
  });

  it("should rollback on validation failure", async () => {
    const mockStatement = createInvalidMockStatement(); // Missing required field

    await expect(importStatement(db, mockStatement)).rejects.toThrow();

    const imports = await db.all("SELECT * FROM statement_imports");
    expect(imports).toHaveLength(0); // Transaction rolled back
  });
});
```

### 9.4 E2E Testing

#### Synthetic PDF Generation
```typescript
import PDFDocument from "pdfkit";

function generateMockRobinhoodStatement(config: StatementConfig): Buffer {
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  // Header
  doc.fontSize(10).text("Robinhood Derivatives, LLC", 50, 50);
  doc.text(`Statement Period: ${config.startDate} - ${config.endDate}`, 50, 65);

  // Section 2: Monthly Trade Confirmations
  doc.fontSize(12).text("Monthly Trade Confirmations", 50, 100);

  const columns = ["Date", "Subtype", "Symbol", "Price", "Qty", "Commission"];
  columns.forEach((col, i) => {
    doc.fontSize(8).text(col, 50 + i * 80, 120);
  });

  let y = 135;
  for (const trade of config.trades) {
    doc.text(trade.date, 50, y);
    doc.text(trade.side, 130, y);
    doc.text(trade.symbol, 210, y);
    doc.text(trade.price.toString(), 290, y);
    doc.text(trade.quantity.toString(), 370, y);
    doc.text(trade.commission.toString(), 450, y);
    y += 15;
  }

  // ... Additional sections

  doc.end();

  return Buffer.concat(chunks);
}
```

#### E2E Test Flow
```typescript
import { test, expect } from "@playwright/test";

test("complete upload and dashboard flow", async ({ page }) => {
  await page.goto("http://localhost:3000/app");

  // 1. Upload statement
  const pdfBuffer = generateMockRobinhoodStatement({
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    trades: generateMockTrades(50),
  });

  await page.setInputFiles('input[type="file"]', {
    name: "statement.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });

  // 2. Wait for parsing
  await expect(page.locator("text=Parsing complete")).toBeVisible({ timeout: 10000 });

  // 3. Verify preview
  await expect(page.locator("text=50 trades found")).toBeVisible();

  // 4. Import
  await page.click("button:has-text('Import')");

  // 5. Verify dashboard
  await expect(page).toHaveURL(/\/app\/dashboard/);
  await expect(page.locator('[data-testid="net-liquidity"]')).toContainText("$");

  // 6. Navigate to trade journal
  await page.click("nav >> text=Trades");

  // 7. Verify table
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(50);

  // 8. Filter by category
  await page.click("button:has-text('Filter')");
  await page.click("text=NFL");
  await expect(rows).toHaveCount(20); // Assuming 20 NFL trades
});
```

---

## 10. Deployment & Distribution

### 10.1 Build Configuration

#### Next.js Config
```typescript
// next.config.js
const nextConfig = {
  output: "export", // Static export for Vercel

  webpack: (config) => {
    // wa-sqlite WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },

  // PWA configuration
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};
```

#### Environment Variables
```bash
# .env.local (not committed)
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_BUILD_TIMESTAMP=2024-01-15T10:30:00Z

# .env.production
NEXT_PUBLIC_DEMO_MODE_ENABLED=true
NEXT_PUBLIC_SENTRY_DSN=# Future: error tracking
```

### 10.2 Deployment Pipeline

#### Vercel Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "out",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/app/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

#### Build Script
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit",
    "prepare": "husky install"
  }
}
```

### 10.3 Browser Support Policy

**Supported Browsers** (Chromium-only for MVP):
- ✅ Chrome 119+ (OPFS stable)
- ✅ Edge 119+
- ✅ Brave 1.60+
- ❌ Firefox (OPFS not supported)
- ❌ Safari (OPFS not supported)

**Detection & Blocking**:
```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isChromium = "storage" in navigator && "getDirectory" in navigator.storage;

    if (!isChromium) {
      // Show full-screen overlay
      document.body.innerHTML = `
        <div class="unsupported-browser">
          <h1>Browser Not Supported</h1>
          <p>This app requires a Chromium-based browser.</p>
          <a href="https://www.google.com/chrome/">Download Chrome</a>
        </div>
      `;
    }
  }, []);

  return <html>{children}</html>;
}
```

### 10.4 Update Mechanism

**Strategy**: Rely on Next.js automatic cache invalidation

**Versioning**:
```typescript
// lib/version.ts
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

// Display in footer
<footer>
  <p>Version {APP_VERSION}</p>
</footer>
```

**Future**: Service Worker for update prompts
```typescript
// Future implementation
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then((registration) => {
    registration.addEventListener("updatefound", () => {
      showUpdatePrompt("New version available. Reload to update?");
    });
  });
}
```

---

## 11. MVP Scope & Timeline

### 11.1 MVP Definition

**Goal**: Deployed to Vercel, usable in production by creator (dogfooding)

**Success Criteria**:
1. Successfully parse and import own Robinhood statements (3-6 months history)
2. Dashboard displays accurate Net Liquidity, P&L, Win Rate
3. Trade journal is filterable and sortable
4. Category-based analytics show meaningful insights
5. Demo mode provides clear onboarding experience
6. Zero critical bugs in core flows

**Non-Goals for MVP**:
- External user validation (beta testing post-MVP)
- Public marketing or landing page copy
- Advanced features (TWR, tax exports, live prices)
- Multi-platform support (Kalshi/ForecastEx parsers)
- Mobile app (PWA install only)

### 11.2 4-6 Week Timeline

#### Week 1: Foundation & Parsing
**Deliverables**:
- Next.js project scaffolding + Tailwind + Shadcn UI
- wa-sqlite OPFS integration + schema creation
- pdf.js setup + basic text extraction
- Section 2 parser (trades table) - v1.0 only

**Validation**: Successfully extract trades from own statement

#### Week 2: Complete Parser & Import Flow
**Deliverables**:
- Parsers for Sections 5, 6, 10
- Version detection logic
- FIFO matching algorithm
- P&L validation (±$0.01 tolerance)
- Duplicate detection
- Import transaction logic

**Validation**: Full statement imported into SQLite with validated P&L

#### Week 3: Dashboard & UI
**Deliverables**:
- Dashboard tiles (Net Liquidity, P&L, Win Rate, Fees)
- Time-series chart (Recharts integration)
- Basic responsive layout (4-col → 1-col)
- Dark theme implementation
- Demo mode with 50 curated trades

**Validation**: Dashboard renders accurately from imported data

#### Week 4: Trade Journal & Filters
**Deliverables**:
- TanStack Table setup with sorting/pagination
- Pre-built filters (date, category, P&L, symbol)
- AND/OR filter composition UI
- Category auto-tagging from symbol regex
- P&L color coding

**Validation**: Trade journal is functional and performant (<2s load)

#### Week 5: Analytics & Polish
**Deliverables**:
- Category performance bar chart
- Volume distribution treemap
- Fee analysis chart
- Inline tooltips for user education
- Error handling UI (section-by-section status)
- Loading states and skeleton screens

**Validation**: All charts render correctly, edge cases handled gracefully

#### Week 6: Testing & Deployment
**Deliverables**:
- Unit tests for parser + FIFO logic (≥80% coverage)
- Synthetic PDF generation for test fixtures
- E2E test for full upload flow
- Vercel deployment + domain setup
- README with setup instructions
- Bug fixes from self-testing

**Validation**: Deployed app is production-ready for personal use

### 11.3 Risk Mitigation

**Biggest Risk**: PDF parser reliability with real-world edge cases

**Mitigation Strategies**:
1. **Early Validation**: Test parser against own statements in Week 1
2. **Incremental Testing**: Add test cases for each new edge case discovered
3. **Graceful Degradation**: Fail explicitly with clear error messages
4. **Version Isolation**: Keep v1.0 parser simple, add versions as needed
5. **Buffer Time**: 6-week timeline includes 1-week buffer for parser iterations

**Other Risks & Mitigation**:
- **OPFS Bugs**: Fallback plan to sql.js if OPFS unstable (lower priority UX)
- **Performance Issues**: Implement indexes early, profile in Week 4
- **Scope Creep**: Ruthlessly cut features not in MVP definition
- **Design Time**: Use Shadcn default components, minimal custom styling

---

## 12. Future Considerations

### 12.1 Post-MVP Features (Prioritized)

#### Phase 2: Advanced Analytics (Weeks 7-10)
- Time-weighted return (TWR) calculation
- Sharpe ratio and risk-adjusted metrics
- Correlation analysis (category performance vs market events)
- Custom date range comparisons

#### Phase 3: Multi-Platform Support (Weeks 11-14)
- Kalshi statement parser
- ForecastEx statement parser
- Cross-platform aggregation
- Platform comparison analytics

#### Phase 4: Export & Integration (Weeks 15-18)
- Tax reporting CSV exports (IRS Form 8949 format)
- Excel workbook export
- JSON export for programmatic access
- Optional cloud backup (encrypted)

#### Phase 5: Enhanced UX (Weeks 19-22)
- Custom trade tagging and notes
- Trade journal search
- Saved filter views
- Performance alerts (email/push notifications)
- Dark/light theme toggle

### 12.2 Technical Debt & Refactoring

**Known Limitations** (acceptable for MVP):
1. **No caching**: On-demand calculation may be slow at scale
   - **Future**: Implement materialized views or Redis caching
2. **Hardcoded category regex**: Requires app updates for new categories
   - **Future**: User-editable category rules stored in DB
3. **No encryption**: SQLite file readable if device compromised
   - **Future**: Encrypt DB with user password + OS keychain
4. **Chromium-only**: Excludes 35% of browser market
   - **Future**: IndexedDB fallback for Firefox/Safari
5. **Simple arithmetic**: Ignores time value of money
   - **Future**: Add TWR and IRR calculations

### 12.3 Monetization Considerations

**Current**: Free, open-source (MIT/Apache)

**Future Options** (if project gains traction):
1. **Premium Features**: TWR, tax exports, cloud sync (subscription)
2. **API Access**: Programmatic access to parsed data
3. **White-Label**: Customizable version for brokerages
4. **Donations**: GitHub Sponsors, Buy Me a Coffee

**Decision Point**: If >100 active users, evaluate monetization to cover potential cloud costs (backups, sync).

### 12.4 Community & Open Source

**License**: MIT or Apache 2.0 (permissive)

**Repository Structure**:
```
rubbin-hood/
├── README.md              # Setup, features, screenshots
├── CONTRIBUTING.md        # Contribution guidelines
├── LICENSE
├── docs/
│   ├── ARCHITECTURE.md    # Technical deep-dive
│   ├── PARSER.md          # Parser implementation details
│   └── DEPLOYMENT.md      # Self-hosting guide
├── src/
└── tests/
```

**Community Goals**:
- Encourage parser contributions for new platforms
- Accept UI/UX improvements via PRs
- Maintain issue templates for bug reports
- Bi-weekly releases with changelog

---

## Appendix A: Decision Log

### Key Architectural Decisions Made During Interview

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| **Full TypeScript stack** (no Python backend) | Solo dev maintainability, single codebase | Python backend for parsing (higher complexity) |
| **wa-sqlite + OPFS** | True persistence without manual save | sql.js (in-memory), IndexedDB (no SQL) |
| **pdf.js with coordinates** | Local-first privacy, no API costs | Cloud extraction services (Textract, Google Doc AI) |
| **Hybrid parsing** (text + coords) | Balance robustness and precision | Pure coordinate-based (brittle), pure text (imprecise) |
| **Version detection by date** | Simple and predictable | Feature detection (complex), try-all (slow) |
| **Reject failed imports** | Data integrity over convenience | Partial imports (risky), manual fixes (tedious) |
| **FIFO + validation** | Match Robinhood's logic exactly | LIFO (wrong), weighted average (loses granularity) |
| **TanStack Query + Zustand** | Separation of data/UI state | Context only (scaling issues), Redux (overkill) |
| **Recharts** | Fast MVP implementation | D3 (too complex), Chart.js (less React-friendly) |
| **Chromium-only MVP** | OPFS stability, faster launch | IndexedDB fallback (2x implementation work) |
| **No telemetry** | Privacy-first commitment | Opt-in telemetry (low adoption, infra needed) |
| **MIT/Apache license** | Community growth, transparency | Proprietary (limits contributions) |

### Risk-Based Decisions

| Risk | Decision | Mitigation |
|------|----------|-----------|
| **Parser reliability** | Test with own statements only (MVP) | Extensive unit tests, synthetic PDFs, clear errors |
| **Performance at scale** | On-demand calculation, no caching | Indexes, query optimization, <2s budget enforced |
| **Schema evolution** | User-prompted migrations with backup | Transactional migrations, rollback on failure |
| **Browser compatibility** | Block non-Chromium browsers explicitly | Clear messaging, Chrome download link |
| **Data loss** | 12-month PDF retention, SQLite export | Encourage regular exports, future cloud backup |

---

## Appendix B: Database Query Examples

### Common Query Patterns

#### Dashboard Tiles
```sql
-- Net Liquidity (latest statement)
SELECT net_liquidity
FROM statement_imports
ORDER BY statement_date DESC
LIMIT 1;

-- Realized P&L (all time)
SELECT SUM(net_pnl) as total_realized_pnl
FROM closed_positions;

-- Unrealized P&L (latest snapshot)
SELECT SUM(unrealized_pnl) as total_unrealized_pnl
FROM open_positions
WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM open_positions);

-- Win Rate (count-based)
SELECT
  CAST(SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100 as win_rate_pct
FROM closed_positions;

-- Win Rate (volume-weighted)
SELECT
  SUM(CASE WHEN net_pnl > 0 THEN ABS(net_pnl) ELSE 0 END) / SUM(ABS(net_pnl)) * 100 as volume_weighted_win_rate
FROM closed_positions;
```

#### Time-Series Data
```sql
-- Monthly P&L trend
SELECT
  strftime('%Y-%m', exit_date) as month,
  SUM(net_pnl) as monthly_pnl
FROM closed_positions
GROUP BY month
ORDER BY month ASC;

-- Net Liquidity over time
SELECT
  statement_date,
  net_liquidity
FROM statement_imports
ORDER BY statement_date ASC;
```

#### Category Analytics
```sql
-- Top categories by profit
SELECT
  t.category,
  SUM(cp.net_pnl) as total_pnl,
  COUNT(*) as num_positions,
  AVG(cp.net_pnl) as avg_pnl
FROM closed_positions cp
JOIN trades t ON t.symbol = cp.symbol AND t.import_id = cp.import_id
WHERE t.category IS NOT NULL
GROUP BY t.category
ORDER BY total_pnl DESC;

-- Category performance with win rates
SELECT
  t.category,
  COUNT(*) as positions,
  SUM(cp.net_pnl) as net_pnl,
  CAST(SUM(CASE WHEN cp.net_pnl > 0 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as win_rate,
  AVG(cp.net_pnl) as avg_pnl_per_position
FROM closed_positions cp
JOIN trades t ON t.symbol = cp.symbol
WHERE t.category != 'Uncategorized'
GROUP BY t.category
HAVING COUNT(*) >= 5  -- Minimum 5 positions for statistical significance
ORDER BY net_pnl DESC;
```

#### Cash Flow Analysis
```sql
-- Bankroll calculation
SELECT
  SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) as total_deposits,
  SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END) as total_withdrawals,
  SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) -
  SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END) as net_bankroll
FROM cash_flows;

-- Trading profit (separate from deposits)
WITH bankroll AS (
  SELECT SUM(amount) as net_deposits
  FROM cash_flows
  WHERE type IN ('DEPOSIT', 'WITHDRAWAL')
),
performance AS (
  SELECT net_liquidity
  FROM statement_imports
  ORDER BY statement_date DESC
  LIMIT 1
)
SELECT
  p.net_liquidity - b.net_deposits as trading_profit
FROM performance p, bankroll b;
```

#### Filtered Trade Journal
```sql
-- Complex filter: NFL trades in Q4 2024 with loss >$50
SELECT
  t.trade_date,
  t.symbol,
  t.side,
  t.quantity,
  t.price,
  cp.net_pnl,
  t.category
FROM trades t
LEFT JOIN closed_positions cp ON cp.symbol = t.symbol AND cp.import_id = t.import_id
WHERE t.category = 'NFL'
  AND t.trade_date BETWEEN '2024-10-01' AND '2024-12-31'
  AND cp.net_pnl < -50
ORDER BY t.trade_date DESC;
```

---

## Appendix C: Component Hierarchy

### Page Structure

```
app/
├── (marketing)/
│   └── page.tsx                    # Landing page (SSG)
│       └── <Hero />
│       └── <Features />
│       └── <CTA />
│
└── app/
    ├── layout.tsx                  # App shell
    │   └── <Sidebar />
    │   └── <TopBar />
    │   └── {children}
    │
    ├── dashboard/
    │   └── page.tsx                # Portfolio Overview
    │       └── <DashboardGrid />
    │           ├── <NetLiquidityTile />
    │           ├── <RealizedPnLTile />
    │           ├── <UnrealizedPnLTile />
    │           ├── <TotalFeesTile />
    │           ├── <TradingProfitTile />
    │           └── <WinRateTile />
    │       └── <TimeSeriesChart />
    │
    ├── trades/
    │   └── page.tsx                # Trade Journal
    │       └── <FilterBar />
    │           └── <FilterBuilder />
    │       └── <TradeTable />      # TanStack Table
    │           └── <PnLBadge />
    │           └── <CategoryPill />
    │
    ├── analytics/
    │   └── page.tsx                # Performance Analytics
    │       └── <CategoryPerformanceChart />
    │       └── <VolumeTreemap />
    │       └── <FeeAnalysisChart />
    │
    ├── settings/
    │   └── page.tsx                # User Preferences
    │       └── <ThemeToggle />
    │       └── <DefaultViewSelector />
    │       └── <ExportButton />
    │
    └── upload/
        └── page.tsx                # Upload Flow
            └── <FileUploader />
            └── <ParsingProgress />
            └── <ParseErrorReport />
            └── <DuplicateModal />
            └── <ImportPreview />
```

---

**End of Specification v2.0**

*This document represents the comprehensive, interview-refined requirements for the Prediction Market Analytics Platform MVP. All architectural decisions have been validated through detailed technical discussion and edge case analysis.*
