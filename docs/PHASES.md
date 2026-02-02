# Implementation Phases - Eventide MVP

This document tracks the sequential implementation phases for the MVP.
Each phase is designed to be completable in 1-3 coding sessions and results in something testable.

## Progress Legend
- [ ] Not started
- [~] In progress
- [x] Complete

---

## Phase 1: Project Foundation
**Status:** [x] Complete

**Description:** Next.js project setup with Tailwind v4, shadcn/ui, and Dark Monarch theme.

**Acceptance Criteria:**
- [x] Next.js 15+ with App Router initialized
- [x] TypeScript configured
- [x] Tailwind v4 with CSS-first configuration
- [x] shadcn/ui initialized with 22 core components
- [x] Dark Monarch theme in globals.css
- [x] Custom trading colors (profit, loss, warning)
- [x] `npm run build` passes without errors
- [x] Test page renders with theme colors visible

**Files Created/Modified:**
- `src/app/globals.css` - Dark Monarch theme
- `src/app/layout.tsx` - Root layout with Inter font
- `src/app/page.tsx` - Theme test page
- `src/components/ui/*` - 22 shadcn components
- `src/lib/utils.ts` - cn() utility
- `components.json` - shadcn config
- `package.json` - Dependencies

---

## Phase 2: App Shell & Routing
**Status:** [x] Complete

**Description:** Create the application layout with sidebar navigation and route structure.

**Acceptance Criteria:**
- [x] AppShell component with sidebar + main content area
- [x] Sidebar with navigation items (Dashboard, Trades, Analytics, Settings)
- [x] TopBar with page title and upload button placeholder
- [x] Route group `(app)` with dashboard, trades, analytics, settings routes
- [x] Active nav state highlighting
- [x] Collapsible sidebar on mobile (Sheet)
- [x] Navigation between routes works

**Files Created:**
- `src/components/layout/app-shell.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/nav-item.tsx`
- `src/components/layout/top-bar.tsx`
- `src/components/layout/index.ts`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/trades/page.tsx`
- `src/app/(app)/analytics/page.tsx`
- `src/app/(app)/settings/page.tsx`

**Demo:** Navigate between all routes with working sidebar

---

## Phase 3: Database Layer
**Status:** [x] Complete

**Description:** Set up wa-sqlite with IndexedDB persistence and create the database schema.

**Acceptance Criteria:**
- [x] wa-sqlite installed and configured (@subframe7536/sqlite-wasm)
- [x] IndexedDB persistence working (data survives page refresh)
- [x] Full schema created (all tables from spec)
- [x] Indexes created for performance
- [x] Views created (monthly_performance, category_performance, portfolio_snapshot)
- [x] Basic CRUD query functions in `lib/db/queries/`
- [x] TanStack Query client configured
- [x] Zustand store for UI state (filters, upload progress)
- [x] Browser compatibility check (block non-Chromium)

**Files Created:**
- `src/lib/db/client.ts` - wa-sqlite initialization with IndexedDB
- `src/lib/db/schema.ts` - Full schema as TypeScript const
- `src/lib/db/schema.sql` - Full schema as SQL file
- `src/lib/db/types.ts` - TypeScript types for all entities
- `src/lib/db/migrations/001_initial.ts` - Initial migration
- `src/lib/db/queries/statements.ts` - Statement import CRUD
- `src/lib/db/queries/trades.ts` - Trade CRUD with filtering
- `src/lib/db/queries/positions.ts` - Position and cash flow CRUD
- `src/lib/db/queries/dashboard.ts` - Dashboard-specific queries
- `src/lib/db/index.ts` - Barrel export
- `src/lib/state/query-client.ts` - TanStack Query setup
- `src/lib/state/query-provider.tsx` - Query provider component
- `src/lib/state/stores.ts` - Zustand stores (filters, upload, preferences)
- `src/lib/state/index.ts` - Barrel export
- `src/components/browser/browser-blocker.tsx` - Chromium check
- `src/app/layout.tsx` - Updated with providers

**Demo:** Insert test data, refresh page, verify data persists

---

## Phase 4: PDF Parsing Foundation
**Status:** [x] Complete

**Description:** Set up pdf.js and create the basic parsing infrastructure.

**Acceptance Criteria:**
- [x] pdf.js installed and working in browser
- [x] Can load a PDF and extract text with coordinates
- [x] Text items have x, y, width, height properties
- [x] Section header detection working (find "Monthly Trade Confirmations")
- [x] Parser registry architecture in place
- [x] Version detection by statement date
- [x] Type definitions for ParsedStatement, TradeRow, etc.

**Files Created:**
- `src/lib/parsing/types.ts` - Full type definitions (TextItem, ExtractedDocument, TradeRow, ParsedStatement, etc.)
- `src/lib/parsing/pdf-loader.ts` - pdf.js wrapper with text extraction
- `src/lib/parsing/utils.ts` - Section detection, column detection, value parsing, symbol categorization
- `src/lib/parsing/version-detector.ts` - Statement version detection by date and structure
- `src/lib/parsing/registry.ts` - Parser registry with automatic version selection
- `src/lib/parsing/index.ts` - Barrel export

**Demo:** Load a real PDF and log extracted text items to console

---

## Phase 5: Section Parsers (Trades & P&L)
**Status:** [x] Complete

**Description:** Parse the core sections needed for trade tracking and P&L calculation.

**Key Insight:** The statement contains multiple representations of trade data:
- **Section 2 (Monthly Trade Confirmations)**: Raw transactions for current month
- **Section 4 (Purchase and Sale)**: Includes prior-month trades that settled this month
- **Section 5 (Purchase and Sale Summary)**: **Source of truth for P&L**

**Acceptance Criteria:**
- [x] Section boundary detection for all 10 sections
- [x] Column position calibration using percentage-based offsets
- [x] Section 2 parser (Monthly Trade Confirmations)
  - [x] Parse trade date, symbol, side (YES/NO), quantity, price
  - [x] Identify "Trade" vs "Final Settlement" entries
  - [x] Handle multi-line wrapped symbols
  - [x] Handle multi-page tables with repeated headers
  - [x] Parse scientific notation prices (0E-8 = 0.00)
- [x] Section 4 parser (Purchase and Sale)
  - [x] Same structure as Section 2
  - [x] Mark trades by source for deduplication with Section 2
- [x] Section 5 parser (Purchase and Sale Summary)
  - [x] Extract gross P&L per symbol/subtype
  - [x] Pair YES/NO rows for same position
- [x] Symbol parsing utility
  - [x] Extract event type (NFL, Fed Decision, etc.)
  - [x] Extract event date from symbol
  - [x] Categorization patterns for 15+ market types
- [x] Unit tests with mock PDF data

**Files Created:**
- `src/lib/parsing/sections/boundaries.ts` - Section boundary detection
- `src/lib/parsing/sections/columns.ts` - Column calibration logic
- `src/lib/parsing/sections/section2.ts` - Monthly Trade Confirmations parser
- `src/lib/parsing/sections/section4.ts` - Purchase and Sale parser
- `src/lib/parsing/sections/section5.ts` - Purchase and Sale Summary parser
- `src/lib/parsing/sections/index.ts` - Barrel exports for sections
- `src/lib/parsing/symbol.ts` - Symbol parsing and categorization
- `src/lib/parsing/parsers/v1.0.ts` - v1.0 parser implementation
- `src/lib/parsing/parsers/index.ts` - Barrel exports for parsers
- `tests/unit/parsing/section2.test.ts` - Section 2 unit tests (20 tests)
- `tests/unit/parsing/section5.test.ts` - Section 5 unit tests (27 tests)
- `tests/unit/parsing/symbol.test.ts` - Symbol parsing unit tests (55 tests)
- `tests/fixtures/section-mocks.ts` - Mock PDF data for testing
- `vitest.config.ts` - Vitest configuration
- `tests/setup.ts` - Test setup with pdf.js mocks

**Demo:** Parse real statement, log extracted trades and P&L summary to console

---

## Phase 6: Complete Parsing Pipeline
**Status:** [x] Complete

**Description:** Implement remaining section parsers, position reconstruction, and P&L validation.

**Key Insight:** P&L validation compares our FIFO calculation against Section 5's authoritative figures. Discrepancies are logged but Section 5 values are used as source of truth.

**Acceptance Criteria:**
- [x] Section 6 parser (Journal Entries - cash flows)
  - [x] Parse date, description, credit/debit amount
  - [x] Classify as DEPOSIT, WITHDRAWAL, FEE, etc.
- [x] Section 7 parser (Open Positions)
  - [x] Parse symbol, quantity, entry price, current price
  - [x] Calculate unrealized P&L
- [x] Section 10 parser (Account Summary)
  - [x] Parse key-value format (different from tabular sections)
  - [x] Extract net liquidity, total fees, gross P&L
- [x] Position ledger construction
  - [x] Build from Section 2 + Section 4 trades
  - [x] Deduplicate prior-month trades
  - [x] Track settlement status
- [x] P&L calculation engine
  - [x] FIFO cost basis calculation
  - [x] Handle YES and NO positions
  - [x] Handle two-sided positions (same event, both outcomes)
- [x] P&L validation against Section 5
  - [x] ±$0.01 tolerance per position
  - [x] Log discrepancies but use statement values
- [x] Fee attribution from Section 3 to individual trades
- [x] Duplicate statement detection (same account + date)
- [x] Full import pipeline with transaction wrapping
- [x] Transform to database DTOs
- [x] Unit tests for FIFO algorithm

**Files to Create/Modify:**
- `src/lib/parsing/sections/section6.ts` - Journal Entries parser
- `src/lib/parsing/sections/section7.ts` - Open Positions parser
- `src/lib/parsing/sections/section10.ts` - Account Summary parser
- `src/lib/calculations/position-ledger.ts` - Position reconstruction
- `src/lib/calculations/fifo.ts` - FIFO P&L calculation
- `src/lib/calculations/validation.ts` - P&L validation against Section 5
- `src/lib/calculations/fee-attribution.ts` - Distribute fees to trades
- `src/lib/parsing/pipeline.ts` - Full import pipeline orchestration
- `src/lib/parsing/transform.ts` - Transform to database DTOs
- `src/lib/db/mutations/import.ts` - Database persistence with transaction
- `tests/unit/calculations/fifo.test.ts`
- `tests/unit/calculations/validation.test.ts`
- `tests/unit/parsing/pipeline.test.ts`

**Validation Checkpoints:**
1. All required sections detected (2, 4, 5, 6, 10)
2. All prices in valid range (0.00 ≤ p ≤ 1.00)
3. All quantities are positive integers
4. Sum of calculated P&L matches Section 10 gross P&L (within tolerance)
5. No duplicate statement exists

**Demo:** Import real statement into database, verify data in SQLite, check P&L validation results

---

## Phase 7: Upload Flow UI
**Status:** [x] Complete

**Description:** Create the upload flow UI components for file selection, parsing feedback, and import.

**Acceptance Criteria:**
- [x] FileUploader with drag-and-drop
- [x] File validation (type, size, page count)
- [x] ParsingProgress showing section-by-section status
- [x] ParseErrorReport for failures
- [x] ImportPreview showing extracted summary
- [x] DuplicateModal for handling existing statements
- [x] ValidationWarningModal for P&L discrepancies
- [x] Full flow: upload → parse → preview → import → redirect to dashboard
- [x] Toast notifications for success/error (console-based for MVP)

**Files Created:**
- `src/components/upload/file-uploader.tsx`
- `src/components/upload/parsing-progress.tsx`
- `src/components/upload/parse-error-report.tsx`
- `src/components/upload/import-preview.tsx`
- `src/components/upload/duplicate-modal.tsx`
- `src/components/upload/validation-warning-modal.tsx`
- `src/components/upload/index.ts`
- `src/features/imports/upload-flow.tsx`
- `src/app/(app)/upload/page.tsx`
- `src/hooks/use-toast.ts`

**Demo:** Upload a real PDF, see parsing progress, preview data, import successfully

---

## Phase 8: Dashboard Foundation
**Status:** [x] Complete

**Description:** Create dashboard tile components with static/mock data.

**Acceptance Criteria:**
- [x] Tile base component with glass effect
- [x] TileHeader with title and info tooltip
- [x] TileValue with formatting (currency, percentage)
- [x] TileTrend indicator (up/down/flat)
- [x] All 6 specific tiles created (static props)
- [x] 4-column responsive grid (4 → 2 → 1)
- [x] Dashboard page layout

**Files Created:**
- `src/components/dashboard/tile.tsx` - Base tile with glass effect
- `src/components/dashboard/tile-header.tsx` - Header with tooltip
- `src/components/dashboard/tile-value.tsx` - Formatted values (currency, percentage, etc.)
- `src/components/dashboard/tile-trend.tsx` - Trend indicator with icons
- `src/components/dashboard/tiles/net-liquidity-tile.tsx`
- `src/components/dashboard/tiles/realized-pnl-tile.tsx`
- `src/components/dashboard/tiles/unrealized-pnl-tile.tsx`
- `src/components/dashboard/tiles/total-fees-tile.tsx`
- `src/components/dashboard/tiles/trading-profit-tile.tsx`
- `src/components/dashboard/tiles/win-rate-tile.tsx`
- `src/components/dashboard/tiles/index.ts` - Barrel export for tiles
- `src/components/dashboard/index.ts` - Barrel export for dashboard components
- `src/features/dashboard/dashboard-grid.tsx` - Responsive grid layout
- `src/features/dashboard/index.ts` - Barrel export

**Files Modified:**
- `src/app/layout.tsx` - Added TooltipProvider
- `src/app/(app)/dashboard/page.tsx` - Updated to use DashboardGrid

**Demo:** Dashboard renders with styled tiles showing mock numbers

---

## Phase 9: Dashboard Data Integration
**Status:** [ ] Not started

**Description:** Connect dashboard to real database queries and add charts.

**Acceptance Criteria:**
- [ ] Dashboard queries in TanStack Query hooks
- [ ] Tiles display real data from database
- [ ] Loading states with skeletons
- [ ] Empty state when no data imported
- [ ] Sparkline component using Recharts
- [ ] TileSparkline showing 6-month trend
- [ ] TimeSeriesChart for net liquidity over time
- [ ] Recharts themed with design system colors

**Files to Create/Modify:**
- `src/lib/db/queries/dashboard.ts` - Dashboard-specific queries
- `src/hooks/use-dashboard-data.ts`
- `src/components/charts/sparkline.tsx`
- `src/components/charts/time-series-chart.tsx`
- `src/components/charts/chart-tooltip.tsx`
- `src/components/feedback/skeleton-loaders.tsx`
- `src/components/feedback/empty-state.tsx`
- Update all tile components to use real data

**Demo:** Import statement → dashboard shows accurate real data with charts

---

## Phase 10: Trade Journal Table
**Status:** [ ] Not started

**Description:** Create the trade journal with TanStack Table.

**Acceptance Criteria:**
- [ ] TanStack Table v8 configured
- [ ] All columns defined (Date, Symbol, Side, Qty, Price, P&L, Fees, Category, Status)
- [ ] Sorting on all sortable columns
- [ ] Default sort by date DESC
- [ ] Pagination (50 rows per page)
- [ ] PnLBadge component (green/red)
- [ ] CategoryPill component with colors
- [ ] SideBadge (YES/NO)
- [ ] StatusBadge (Open/Closed)
- [ ] Horizontal scroll on mobile with sticky first column

**Files to Create/Modify:**
- `src/components/trade-journal/trade-table.tsx`
- `src/components/trade-journal/columns.tsx`
- `src/components/trade-journal/pnl-badge.tsx`
- `src/components/trade-journal/category-pill.tsx`
- `src/components/trade-journal/side-badge.tsx`
- `src/components/trade-journal/status-badge.tsx`
- `src/hooks/use-trades-data.ts`
- `src/app/(app)/trades/page.tsx`

**Demo:** View all trades in sortable, paginated table

---

## Phase 11: Trade Journal Filters
**Status:** [ ] Not started

**Description:** Add filtering capabilities to the trade journal.

**Acceptance Criteria:**
- [ ] FilterBar component
- [ ] DateRangeFilter with calendar picker
- [ ] CategoryFilter multi-select
- [ ] PnLRangeFilter with slider
- [ ] Status filter (All/Open/Closed)
- [ ] FilterChip showing active filters
- [ ] Clear all filters button
- [ ] Filters persist in Zustand (and localStorage)
- [ ] Mobile: filters in Sheet drawer
- [ ] Export to CSV button

**Files to Create/Modify:**
- `src/components/trade-journal/filters/filter-bar.tsx`
- `src/components/trade-journal/filters/date-range-filter.tsx`
- `src/components/trade-journal/filters/category-filter.tsx`
- `src/components/trade-journal/filters/pnl-range-filter.tsx`
- `src/components/trade-journal/filters/filter-chip.tsx`
- `src/lib/state/filter-store.ts`
- `src/lib/utils/csv-export.ts`

**Demo:** Filter trades by date, category, P&L; export filtered results to CSV

---

## Phase 12: Analytics Charts
**Status:** [ ] Not started

**Description:** Create the analytics page with performance charts.

**Acceptance Criteria:**
- [ ] CategoryPerformanceChart (horizontal bar)
- [ ] VolumeTreemap showing volume distribution
- [ ] FeeAnalysisChart (stacked bar + cumulative line)
- [ ] Charts use design system colors
- [ ] Click on category bar → navigates to filtered trades
- [ ] Responsive chart sizing
- [ ] Chart tooltips styled consistently
- [ ] Analytics page layout with all 3 charts

**Files to Create/Modify:**
- `src/components/charts/category-performance-chart.tsx`
- `src/components/charts/volume-treemap.tsx`
- `src/components/charts/fee-analysis-chart.tsx`
- `src/components/charts/chart-legend.tsx`
- `src/hooks/use-analytics-data.ts`
- `src/features/analytics/analytics-view.tsx`
- `src/app/(app)/analytics/page.tsx`

**Demo:** View category performance, volume distribution, and fee analysis charts

---

## Phase 13: Demo Mode
**Status:** [ ] Not started

**Description:** Create demo mode with curated sample data for onboarding.

**Acceptance Criteria:**
- [ ] 50 curated demo trades covering key scenarios
- [ ] Demo covers: NFL profits, Economics losses, Tennis break-even, Politics big win, fee drag
- [ ] Demo data generates realistic P&L distribution
- [ ] Demo database loads on first visit (no real data)
- [ ] "Try with your data" CTA in demo mode
- [ ] Confirmation modal when uploading first real statement
- [ ] Demo data wiped on first real import
- [ ] Demo indicator badge in UI

**Files to Create/Modify:**
- `src/lib/demo/demo-data.ts` - Curated trade data
- `src/lib/demo/generate-demo-db.ts`
- `src/lib/state/demo-store.ts`
- `src/components/feedback/demo-badge.tsx`
- `src/features/demo/demo-transition-modal.tsx`
- Update upload flow to handle demo → real transition

**Demo:** Fresh visit shows demo data; upload real statement replaces demo

---

## Phase 14: Settings & Polish
**Status:** [ ] Not started

**Description:** Create settings page and polish edge cases.

**Acceptance Criteria:**
- [ ] Settings page layout
- [ ] Default view selector (Dashboard/Trades/Analytics)
- [ ] Database export button (download SQLite file)
- [ ] Storage indicator showing OPFS usage
- [ ] Delete all data button with confirmation
- [ ] Import history list with delete per import
- [ ] BrowserBlocker for non-Chromium
- [ ] StorageWarning when >80% full
- [ ] App version in footer

**Files to Create/Modify:**
- `src/components/settings/settings-section.tsx`
- `src/components/settings/default-view-selector.tsx`
- `src/components/settings/export-button.tsx`
- `src/components/settings/storage-indicator.tsx`
- `src/components/settings/import-history.tsx`
- `src/components/browser/browser-blocker.tsx`
- `src/components/browser/storage-warning.tsx`
- `src/features/settings/settings-view.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/lib/db/mutations/export.ts`
- `src/lib/db/mutations/delete.ts`

**Demo:** Export database, view storage usage, delete imports

---

## Phase 15: Testing & Error States
**Status:** [ ] Not started

**Description:** Add comprehensive tests and polish error handling.

**Acceptance Criteria:**
- [ ] Unit tests for all parsers (≥80% coverage)
- [ ] Unit tests for FIFO algorithm
- [ ] Unit tests for P&L validation
- [ ] Integration tests for database operations
- [ ] E2E test for upload → dashboard flow
- [ ] ErrorState component for failed queries
- [ ] EmptyState variations for each page
- [ ] Loading skeletons for all async content
- [ ] Error boundaries for graceful failures
- [ ] Vitest configured and passing

**Files to Create/Modify:**
- `tests/unit/parsing/*.test.ts`
- `tests/unit/calculations/*.test.ts`
- `tests/integration/db/*.test.ts`
- `tests/e2e/upload-flow.spec.ts`
- `src/components/feedback/error-state.tsx`
- `src/components/feedback/empty-state.tsx` (variations)
- `src/components/feedback/loading-spinner.tsx`
- `vitest.config.ts`
- `playwright.config.ts`

**Demo:** Run `npm test` with all tests passing

---

## Phase 16: Deployment
**Status:** [ ] Not started

**Description:** Configure for production deployment.

**Acceptance Criteria:**
- [ ] next.config.ts configured for static export
- [ ] WASM/OPFS headers configured
- [ ] vercel.json with proper headers
- [ ] Environment variables set up
- [ ] Build passes (`npm run build`)
- [ ] Deploy to Vercel succeeds
- [ ] All features work in production
- [ ] README updated with setup instructions
- [ ] Final bug fixes from production testing

**Files to Create/Modify:**
- `next.config.ts` - Static export + WASM config
- `vercel.json` - Deployment config
- `.env.example`
- `README.md`

**Demo:** Visit deployed URL, full app works in production

---

## Summary

| Phase | Name | Sessions | Dependency |
|-------|------|----------|------------|
| 1 | Project Foundation | 1 | - |
| 2 | App Shell & Routing | 1-2 | Phase 1 |
| 3 | Database Layer | 2-3 | Phase 2 |
| 4 | PDF Parsing Foundation | 1-2 | Phase 1 |
| 5 | Section 2 Parser | 2-3 | Phase 4 |
| 6 | Complete Parsing | 2-3 | Phase 3, 5 |
| 7 | Upload Flow UI | 2-3 | Phase 6 |
| 8 | Dashboard Foundation | 1-2 | Phase 2 |
| 9 | Dashboard Data Integration | 2 | Phase 3, 7, 8 |
| 10 | Trade Journal Table | 2-3 | Phase 3 |
| 11 | Trade Journal Filters | 1-2 | Phase 10 |
| 12 | Analytics Charts | 2 | Phase 3 |
| 13 | Demo Mode | 1-2 | Phase 9, 10, 12 |
| 14 | Settings & Polish | 1-2 | Phase 3 |
| 15 | Testing & Error States | 2-3 | Phase 7, 9-12 |
| 16 | Deployment | 1 | Phase 15 |

**Estimated Total:** 22-35 coding sessions (4-6 weeks at ~5 sessions/week)

---

## Dependency Graph

```
Phase 1 (Foundation)
    ├── Phase 2 (App Shell)
    │       └── Phase 3 (Database)
    │               ├── Phase 6 (Complete Parsing) ─┐
    │               ├── Phase 9 (Dashboard Data) ───┼── Phase 13 (Demo Mode)
    │               ├── Phase 10 (Trade Table) ─────┤
    │               │       └── Phase 11 (Filters)  │
    │               ├── Phase 12 (Analytics) ───────┘
    │               └── Phase 14 (Settings)
    │       └── Phase 8 (Dashboard Foundation)
    │               └── Phase 9 (Dashboard Data)
    │
    └── Phase 4 (PDF Foundation)
            └── Phase 5 (Section 2 Parser)
                    └── Phase 6 (Complete Parsing)
                            └── Phase 7 (Upload UI)
                                    └── Phase 9 (Dashboard Data)

Phase 15 (Testing) ── depends on ── Phases 7, 9-12
Phase 16 (Deployment) ── depends on ── Phase 15
```

---

## Quick Reference: What's Testable After Each Phase

| Phase | You Can Test/Demo |
|-------|-------------------|
| 1 | Theme renders, components visible |
| 2 | Navigate between pages |
| 3 | Data persists after refresh |
| 4 | Load PDF, see text in console |
| 5 | Parse trades from real PDF |
| 6 | Import statement, data in DB |
| 7 | Full upload flow in UI |
| 8 | Dashboard with styled mock tiles |
| 9 | Dashboard with real data + charts |
| 10 | View/sort/paginate trades |
| 11 | Filter trades, export CSV |
| 12 | View analytics charts |
| 13 | Demo mode on fresh visit |
| 14 | Export DB, manage settings |
| 15 | All tests pass |
| 16 | Production deployment works |
