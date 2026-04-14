# AGENTS.md

Guidance for AI coding agents working in the Eventide (rubbin-hood) codebase.

## Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build (Next.js static export)
npm run lint             # ESLint (Next.js core-web-vitals + TypeScript)
npx tsc --noEmit         # Type-check only

# Testing (Vitest, Node environment)
npm test                 # Watch mode
npm run test:run         # Single run, all tests
npm run test:coverage    # With v8 coverage
npx vitest run tests/unit/parsing/section2.test.ts   # Single file
npx vitest run -t "should handle empty section"      # Single test by name
```

## Architecture

Local-first prediction market analytics. No server, no API, no auth. PDF statements parsed client-side, stored in IndexedDB via wa-sqlite.

```
PDF Upload → pdf.js → Section Parsers → wa-sqlite/IndexedDB
                                              ↓
                         React UI ← TanStack Query ← SQL queries
                           ↑
                      Zustand (filters, UI state, preferences)
```

### Key Layers

| Layer | Location | Purpose |
|-------|----------|---------|
| Database | `src/lib/db/` | wa-sqlite singleton, query queue, schema, migrations |
| Queries | `src/lib/db/queries/` | Parameterized SQL, sort field whitelisting, barrel-exported |
| Parsing | `src/lib/parsing/` | Pure TS (no React deps), versioned parsers, section logic |
| State | `src/lib/state/` | TanStack Query v5 + Zustand stores |
| Hooks | `src/hooks/` | TanStack Query wrappers over query functions |
| Calculations | `src/lib/calculations/` | FIFO P&L, fee attribution, validation — pure TS |
| Features | `src/features/` | Page-level orchestration: upload flow, analytics view, demo, settings |
| Format | `src/lib/format.ts` | `formatCurrency`, `formatPnl`, `formatPercent` |
| Components | `src/components/<domain>/` | Domain folders with barrel `index.ts` |
| Pages | `src/app/(app)/` | All `"use client"`, routes: dashboard/trades/analytics/settings/upload/demo-parse |

### Critical Rules

- **P&L is computed in SQL** — never in JavaScript. See `PNL_EXPRESSION` / `STATUS_EXPRESSION` in `queries/trades.ts`.
- **Position journal groups by symbol** — the `/trades` page shows `PositionJournalRow` (one row per symbol), not individual YES/NO trades. P&L sourced from `closed_positions` table via `LEFT JOIN`. Child trades lazy-loaded on expand via `getTradesForPosition(symbol)`.
- **Upload supports multiple PDFs** — `FileUploader` accepts `File[]`, `upload-flow.tsx` parses sequentially with aggregate preview, imports sequentially with per-file duplicate handling and resume.
- **Chromium-only** (Chrome 119+, Edge 119+, Brave 1.60+). OPFS requirement blocks Firefox/Safari. `BrowserBlocker` enforces this.
- **All queries are serialized** through the db query queue. Transactions bypass the queue to avoid deadlock.
- **Parser registration uses side-effect imports** — `src/lib/parsing/register.ts` imports platform importers for their registration side effects. Upload flow imports `register.ts` to activate dispatch.
- **Page boundary isolation** — PDF items on different pages are NEVER grouped into the same row. This is enforced in `pdf-loader.ts` and `columns.ts`.
- **Robinhood sells = opposite-side buys** — Robinhood represents "selling" as "buying the opposite side" (YES+NO=$1.00). Pairing logic in `import-pipeline.ts` handles this.
- **Kalshi settlement_price placement** — `settlement_price` must be placed on the OPEN trade so SQL P&L computes against the entry price. See `kalshi/transform.ts`.
- **FIFO ordering** — Within the same date, OPEN trades must be processed before CLOSE/SETTLE. See `calculations/fifo.ts`.

## Code Style

### Formatting

- **Double quotes** for all strings (`"not 'single'"`)
- **2-space indentation**, semicolons always, trailing commas
- No Prettier — formatting conventions are by example
- ESLint: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`

### Imports

Order with blank lines between groups:

```typescript
// 1. React / framework
import * as React from "react";
import { useMemo } from "react";

// 2. External libraries
import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";

// 3. Internal (use @/ alias, never relative outside current module)
import { queryKeys } from "@/lib/state/query-client";
import { getTradesForJournal } from "@/lib/db/queries/trades";
import { cn } from "@/lib/utils";

// 4. Type-only imports last
import type { SortOptions, TradeFilter } from "@/lib/db/types";
```

### Naming

| What | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `use-trades-data.ts`, `query-client.ts` |
| Components | PascalCase | `Tile`, `TileHeader`, `BrowserBlocker` |
| Hooks | camelCase, `use` prefix | `useTradesData`, `useFilterStore` |
| Functions | camelCase | `getTradesForJournal`, `createTrade` |
| Types/Interfaces | PascalCase | `TradeFilter`, `PaginationOptions` |
| Type aliases/unions | PascalCase | `TradeSide`, `UploadStatus` |
| SQL constants | UPPER_SNAKE_CASE | `PNL_EXPRESSION`, `STATUS_EXPRESSION` |
| Store defaults | camelCase | `defaultFilterState`, `defaultUploadState` |

### Types

- Base types match SQL schema → `lib/db/types.ts`
- Separated into: **base** (DB rows), **enriched** (computed fields), **input** (mutations), **filter**, **view**
- `interface` for object shapes; `type` for unions and aliases
- SQL nullable → `| null`; optional inputs → `?:`
- No `as any`, `@ts-ignore`, or `@ts-expect-error`

### Exports

- **Named exports only** (no default exports except config files like `next.config.ts`)
- Every module folder has a barrel `index.ts`
- Export types alongside values: `export { Tile }; export type { TileProps };`
- Component domain barrels explicitly name exports (not `export *` for component folders)

### Comments

```typescript
/** File-level JSDoc block at top of every file */

/** Function-level JSDoc for public functions */

// Inline comments for non-obvious logic only

// ============================================================================
// SECTION SEPARATORS for type/query groupings
// ============================================================================
```

## Component Patterns

- `React.forwardRef` for base UI primitives; set `.displayName`
- Props extend HTML attributes: `interface XProps extends React.HTMLAttributes<HTMLDivElement>`
- `cn()` (clsx + tailwind-merge) for class composition
- `"use client"` at top of hooks and page components
- Financial numbers: `font-mono tabular-nums`
- Colors: CSS variables `--profit` (green), `--loss` (red), `--warning` (yellow) in oklch

## State Patterns

### Zustand Stores (`src/lib/state/stores.ts`)

- Interface → default state → `create<Interface>()` pattern
- `persist` middleware with `createJSONStorage(() => localStorage)` for durable state
- `partialize` to persist only specific fields
- **Every filter setter resets `page` to 1**

### TanStack Query (`src/lib/state/query-client.ts`)

- Factory-pattern query keys: `queryKeys.trades.list({ filter, page, pageSize, sort })`, `queryKeys.positions.journal.list(...)`, `queryKeys.positions.journal.trades(symbol)`
- 60s default stale time; 5min gc time; child trade queries use 5min stale time
- Hooks in `src/hooks/` wrap query functions — never call `query()` directly from components

## Database Patterns

- Parameterized SQL with `?` placeholders — never interpolate values
- **Whitelist sort fields** to prevent SQL injection: `allowedFields.includes(field) ? field : "trade_date"`
- `query<T>()` for reads, `execute()` for writes, `getDatabase()` for bulk/direct access
- Bulk inserts: caller wraps in `transaction()` if needed

## Testing

- **Vitest** with Node environment; test files in `tests/unit/<domain>/`
- Coverage targets: `src/lib/parsing/**` and `src/lib/calculations/**`
- Fixtures in `tests/fixtures/`; mock factories prefixed `createMock*`
- Pattern: `describe("functionName", () => { it("should ...", () => { expect(...) }) })`
- Import from vitest: `import { describe, it, expect } from "vitest"`
- `tests/setup.ts` mocks `pdfjs-dist` and `pdf-loader` for Node compatibility

## How-To Recipes

### Adding a Query
1. Write parameterized SQL in `src/lib/db/queries/<domain>.ts`
2. Whitelist sort fields, use `?` params
3. Export from `src/lib/db/queries/index.ts`
4. Create TanStack Query hook in `src/hooks/use-<domain>-data.ts`
5. Add query key to `queryKeys` factory in `src/lib/state/query-client.ts`
6. Export hook from `src/hooks/index.ts`

### Adding a Filter
1. Add state + setter to `FilterState` in `src/lib/state/stores.ts`
2. Setter **must** reset `page` to 1
3. Subscribe in the relevant hook; include in query key

### Adding a Component
1. Create in `src/components/<domain>/`
2. Export from domain barrel `index.ts`
3. Import via folder path: `from "@/components/dashboard"`

### Adding a Parser Section
1. Create section parser in `src/lib/parsing/sections/`
2. Pure TypeScript — no React dependencies
3. Add tests in `tests/unit/parsing/`
4. Register in `src/lib/parsing/registry.ts`

## Complexity Hotspots

Files >500 lines (modify with care):

| File | Lines | Purpose |
|------|-------|---------|
| `lib/parsing/robinhood/import-pipeline.ts` | 1074 | Full import orchestration |
| `lib/parsing/robinhood/sections/columns.ts` | 981 | Column calibration for PDF tables |
| `features/imports/upload-flow.tsx` | 716 | Upload UI state machine |
| `lib/parsing/symbol.ts` | 593 | Symbol parsing + categorization |
| `lib/db/queries/trades.ts` | 588 | Trade queries with SQL P&L |
