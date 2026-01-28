# Implementation Phases - Rubbin Hood MVP

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
**Status:** [ ] Not started

**Description:** Create the application layout with sidebar navigation and route structure.

**Acceptance Criteria:**
- [ ] AppShell component with sidebar + main content area
- [ ] Sidebar with navigation items (Dashboard, Trades, Analytics, Settings)
- [ ] TopBar with page title and upload button placeholder
- [ ] Route group `(app)` with dashboard, trades, analytics, settings routes
- [ ] Active nav state highlighting
- [ ] Collapsible sidebar on mobile (Sheet)
- [ ] Navigation between routes works

**Files to Create/Modify:**
- `src/components/layout/app-shell.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/nav-item.tsx`
- `src/components/layout/top-bar.tsx`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/trades/page.tsx`
- `src/app/(app)/analytics/page.tsx`
- `src/app/(app)/settings/page.tsx`

**Demo:** Navigate between all routes with working sidebar

---

## Phase 3: Database Layer
**Status:** [ ] Not started

**Description:** Set up wa-sqlite with OPFS persistence and create the database schema.

**Acceptance Criteria:**
- [ ] wa-sqlite installed and configured
- [ ] OPFS persistence working (data survives page refresh)
- [ ] Full schema created (all tables from spec)
- [ ] Indexes created for performance
- [ ] Views created (monthly_performance, category_performance, portfolio_snapshot)
- [ ] Basic CRUD query functions in `lib/db/queries/`
- [ ] TanStack Query client configured
- [ ] Zustand store for UI state (filters, upload progress)
- [ ] Browser compatibility check (block non-Chromium)

**Files to Create/Modify:**
- `src/lib/db/client.ts` - wa-sqlite initialization
- `src/lib/db/schema.sql` - Full schema
- `src/lib/db/migrations/001_initial.ts`
- `src/lib/db/queries/statements.ts`
- `src/lib/db/queries/trades.ts`
- `src/lib/db/queries/positions.ts`
- `src/lib/db/queries/dashboard.ts`
- `src/lib/state/query-client.ts`
- `src/lib/state/stores.ts`
- `src/components/browser/browser-blocker.tsx`

**Demo:** Insert test data, refresh page, verify data persists

---

## Phase 4: PDF Parsing Foundation
**Status:** [ ] Not started

**Description:** Set up pdf.js and create the basic parsing infrastructure.

**Acceptance Criteria:**
- [ ] pdf.js installed and working in browser
- [ ] Can load a PDF and extract text with coordinates
- [ ] Text items have x, y, width, height properties
- [ ] Section header detection working (find "Monthly Trade Confirmations")
- [ ] Parser registry architecture in place
- [ ] Version detection by statement date
- [ ] Type definitions for ParsedStatement, TradeRow, etc.

**Files to Create/Modify:**
- `src/lib/parsing/pdf-loader.ts` - pdf.js wrapper
- `src/lib/parsing/types.ts` - Type definitions
- `src/lib/parsing/registry.ts` - Parser registry
- `src/lib/parsing/version-detector.ts`
- `src/lib/parsing/utils.ts` - Text anchor finding, column detection

**Demo:** Load a real PDF and log extracted text items to console

---

## Phase 5: Section 2 Parser (Trades)
**Status:** [ ] Not started

**Description:** Parse the Monthly Trade Confirmations section to extract individual trades.

**Acceptance Criteria:**
- [ ] Find Section 2 header in PDF
- [ ] Detect column positions (Date, Subtype, Symbol, Price, Qty, Commission)
- [ ] Extract all trade rows
- [ ] Handle multi-line symbols (wrapped text)
- [ ] Handle multi-page tables
- [ ] Parse dates, numbers, and sides correctly
- [ ] Unit tests with mock data pass
- [ ] Works on real Robinhood statement

**Files to Create/Modify:**
- `src/lib/parsing/sections/section2.ts` - Trade parser
- `src/lib/parsing/parsers/v1.0.ts` - v1.0 parser implementation
- `tests/unit/parsing/section2.test.ts`
- `tests/fixtures/section2-mock.ts`

**Demo:** Parse real statement, log extracted trades to console

---

## Phase 6: Complete Parsing Pipeline
**Status:** [ ] Not started

**Description:** Implement remaining section parsers and the full import pipeline.

**Acceptance Criteria:**
- [ ] Section 5 parser (Purchase and Sale Summary - P&L)
- [ ] Section 6 parser (Journal Entries - cash flows)
- [ ] Section 10 parser (Account Summary - net liquidity)
- [ ] FIFO matching algorithm for P&L calculation
- [ ] P&L validation (calculated vs statement, ±$0.01 tolerance)
- [ ] Symbol categorization (NFL, NBA, Economics, etc.)
- [ ] Duplicate detection (same statement date + account)
- [ ] Full import transaction (all-or-nothing)
- [ ] Unit tests for FIFO algorithm

**Files to Create/Modify:**
- `src/lib/parsing/sections/section5.ts`
- `src/lib/parsing/sections/section6.ts`
- `src/lib/parsing/sections/section10.ts`
- `src/lib/calculations/fifo.ts`
- `src/lib/calculations/validation.ts`
- `src/lib/calculations/categorization.ts`
- `src/lib/db/mutations/import.ts`
- `tests/unit/calculations/fifo.test.ts`

**Demo:** Import real statement into database, verify data in SQLite

---

## Phase 7: Upload Flow UI
**Status:** [ ] Not started

**Description:** Create the upload flow UI components for file selection, parsing feedback, and import.

**Acceptance Criteria:**
- [ ] FileUploader with drag-and-drop
- [ ] File validation (type, size, page count)
- [ ] ParsingProgress showing section-by-section status
- [ ] ParseErrorReport for failures
- [ ] ImportPreview showing extracted summary
- [ ] DuplicateModal for handling existing statements
- [ ] ValidationWarningModal for P&L discrepancies
- [ ] Full flow: upload → parse → preview → import → redirect to dashboard
- [ ] Toast notifications for success/error

**Files to Create/Modify:**
- `src/components/upload/file-uploader.tsx`
- `src/components/upload/parsing-progress.tsx`
- `src/components/upload/parse-error-report.tsx`
- `src/components/upload/import-preview.tsx`
- `src/components/upload/duplicate-modal.tsx`
- `src/components/upload/validation-warning-modal.tsx`
- `src/features/imports/upload-flow.tsx`
- `src/app/(app)/upload/page.tsx`

**Demo:** Upload a real PDF, see parsing progress, preview data, import successfully

---

## Phase 8: Dashboard Foundation
**Status:** [ ] Not started

**Description:** Create dashboard tile components with static/mock data.

**Acceptance Criteria:**
- [ ] Tile base component with glass effect
- [ ] TileHeader with title and info tooltip
- [ ] TileValue with formatting (currency, percentage)
- [ ] TileTrend indicator (up/down/flat)
- [ ] All 6 specific tiles created (static props)
- [ ] 4-column responsive grid (4 → 2 → 1)
- [ ] Dashboard page layout

**Files to Create/Modify:**
- `src/components/dashboard/tile.tsx`
- `src/components/dashboard/tile-header.tsx`
- `src/components/dashboard/tile-value.tsx`
- `src/components/dashboard/tile-trend.tsx`
- `src/components/dashboard/tiles/net-liquidity-tile.tsx`
- `src/components/dashboard/tiles/realized-pnl-tile.tsx`
- `src/components/dashboard/tiles/unrealized-pnl-tile.tsx`
- `src/components/dashboard/tiles/total-fees-tile.tsx`
- `src/components/dashboard/tiles/trading-profit-tile.tsx`
- `src/components/dashboard/tiles/win-rate-tile.tsx`
- `src/features/dashboard/dashboard-grid.tsx`

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
