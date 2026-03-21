# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start dev server (http://localhost:3000)
npm run build         # Production build (Next.js static export)
npm run lint          # ESLint
npm test              # Vitest watch mode
npm run test:run      # Vitest single run
npm run test:coverage # Vitest with coverage
npx tsc --noEmit      # Type check
```

## Architecture

Eventide is a **local-first** prediction market analytics platform. All data lives in the browser — no server, no API, no auth. Users upload Robinhood Derivatives PDF statements which are parsed client-side and stored in IndexedDB via wa-sqlite.

### Data Flow

```
PDF Upload → pdf.js extraction → Section Parsers → wa-sqlite/IndexedDB
                                                         ↓
                              React UI ← TanStack Query ← SQL queries
                                ↑
                           Zustand (filters, UI state, preferences)
```

### Key Layers

- **Database** (`src/lib/db/`): wa-sqlite singleton with a **query queue** to prevent IndexedDB lock contention. All queries are serialized; transactions bypass the queue to avoid deadlock. Schema defined in `schema.ts`, migrations in `migrations/`.
- **Queries** (`src/lib/db/queries/`): Parameterized SQL with field whitelisting for sort columns. P&L and status are **computed in SQL** (not React). Barrel-exported from `index.ts`.
- **Parsing** (`src/lib/parsing/`): Pure TypeScript, no React deps. Versioned parsers in `parsers/`, section-specific logic in `sections/`, version detection in `registry.ts`. Deduplicates trades across Sections 2 & 4.
- **State** (`src/lib/state/`): TanStack Query v5 with factory-pattern query keys (`queryKeys.trades.list(...)`) and 60s stale time. Zustand stores for filters (resets page to 1 on change), upload status, user preferences, and UI state.
- **Hooks** (`src/hooks/`): TanStack Query wrappers over DB query functions. Barrel-exported from `index.ts`. Position journal uses `usePositionsData` (grouped view) and `usePositionTrades` (lazy child trades on expand).
- **Components** (`src/components/<domain>/`): Each domain folder has barrel `index.ts`. shadcn/ui primitives in `components/ui/`.
- **Pages** (`src/app/(app)/`): All `"use client"`. Routes: dashboard, trades, analytics, settings, upload, demo-parse.
- **Features** (`src/features/`): Cross-cutting features like `imports/upload-flow.tsx` (multi-file PDF upload with sequential parse/import and per-file duplicate handling) and `demo/` (demo mode transition).

### P&L Computation

Computed in SQL, not in JavaScript:
- **YES/LONG**: `(settlement_price - price) * qty`
- **NO/SHORT**: `((1 - settlement_price) - price) * qty`
- **Status**: `OPEN` if `settlement_date IS NULL`, else `CLOSED`
- Per-trade: `TradeJournalRow` extends `Trade` with computed `pnl` and `status`.
- Per-position: `PositionJournalRow` groups all trades by symbol via CTE (`GROUP BY t.symbol`), with authoritative P&L from `LEFT JOIN closed_positions`. The `/trades` page uses this grouped view — one expandable row per symbol with lazy-loaded child trades.

### Patterns to Follow

- **Adding a query**: Write parameterized SQL in `lib/db/queries/`, whitelist sort fields, export from barrel `index.ts`, wrap in a TanStack Query hook in `src/hooks/`.
- **Adding a filter**: Add state + setter to Zustand filter store in `stores.ts` (setter must reset `page` to 1), subscribe to it in the relevant hook, include in query key.
- **Adding a component**: Create in `src/components/<domain>/`, export from barrel `index.ts`, import via folder path.
- **Financial numbers**: Use `font-mono tabular-nums` for column alignment.
- **Colors**: Use CSS variables `--profit` (green), `--loss` (red), `--warning` (yellow) defined in `globals.css` with oklch values.
- **Types**: Base types match SQL schema in `lib/db/types.ts`. Separate base/enriched/input/filter type categories.
- **TanStack Table**: Manual sorting/pagination — SQL handles it, not the table. `PositionTable` uses `React.Fragment` for expand rows (not TanStack's `subRows` API), with local expand state that resets on page/filter change.
- **Multi-file upload**: `FileUploader` accepts `File[]`. Upload flow parses files sequentially, shows aggregate preview with per-file breakdown table, imports sequentially with per-file duplicate handling and resume.

### Browser Requirement

Chromium-only (Chrome 119+, Edge 119+, Brave 1.60+). Firefox/Safari blocked due to OPFS requirement. `BrowserBlocker` component enforces this in root layout.

### Testing

Tests cover the parsing and calculations layers (`src/lib/parsing/`, `src/lib/calculations/`). Vitest with Node environment. Test files in `tests/unit/<domain>/`. Run single file: `npx vitest run tests/unit/parsing/section2.test.ts`. Run by name: `npx vitest run -t "should handle empty section"`.
