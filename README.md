# Eventide

**Local-first analytics for prediction market traders**

**[Try it live at eventide.s11a.com](https://eventide.s11a.com/)**

Eventide turns your Robinhood Derivatives PDF statements into actionable trading analytics — entirely in your browser. No server, no cloud, no account. Upload your monthly statements and instantly see your true P&L, win rate, fee drag, and category performance.

---

## Why Eventide?

Robinhood's monthly statements are dense PDFs with YES/NO contract legs reported separately. Understanding your actual performance requires cross-referencing sections, pairing opposite legs, and reconciling settlements. Eventide does all of this automatically.

**What you get:**

- **Dashboard** — Net liquidity over time, realized P&L, win rate, fee drag, open positions, and trading profit at a glance
- **Position Journal** — Grouped by symbol with net P&L. Expand any position to see underlying YES/NO legs, entry/exit prices, and settlement details
- **Analytics** — Category performance charts (NFL, NBA, Economics, etc.), volume treemaps, and fee analysis breakdowns
- **Multi-statement support** — Import multiple monthly PDFs at once with aggregate preview and per-file breakdown

## Privacy First

Your financial data never leaves your browser.

| Principle | How |
|-----------|-----|
| **No Server Upload** | PDFs parsed entirely in-browser using WebAssembly |
| **No Cloud Database** | Data stored in your browser's IndexedDB via wa-sqlite |
| **No Telemetry** | Zero analytics, tracking, or usage monitoring |
| **No Account** | No email, no login, no personal information collected |
| **Open Source** | Fully auditable — verify every claim in the source |
| **Offline Capable** | Works without internet after initial load |

The only network request is loading the app itself. Everything else — parsing, calculations, storage — runs locally.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A Chromium-based browser (Chrome 119+, Edge 119+, or Brave 1.60+)

### Install and Run

```bash
git clone https://github.com/snimmagadda1/rubbin-hood.git
cd rubbin-hood
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and upload your first statement.

### Try the Demo

Don't have a statement handy? Click **Try Demo** on the landing page to explore the app with sample data. When you upload your first real statement, the demo data is automatically replaced.

## How It Works

```
PDF Upload → pdf.js → Section Parsers → wa-sqlite/IndexedDB
                                              ↓
                         React UI ← TanStack Query ← SQL queries
                           ↑
                      Zustand (filters, UI state)
```

### Statement Parsing

Eventide parses 7 sections from Robinhood Derivatives monthly statements:

| Section | Content | What It Provides |
|---------|---------|------------------|
| 2 | Monthly Trade Confirmations | Individual trades with prices, quantities, fees |
| 3 | Non-Trade Activity | Account activity records |
| 4 | Purchase and Sale | Prior-period settlements, closing trades |
| 5 | Purchase and Sale Summary | **Source of truth for P&L** — paired YES/NO totals per symbol |
| 6 | Journal Entries | Cash flows: deposits, withdrawals, interest |
| 7 | Open Positions | Unrealized positions with current market value |
| 10 | Account Summary | Net liquidity, ending cash, total fees |

Trades from Sections 2 and 4 are deduplicated automatically. P&L figures from Section 5 are cross-validated against FIFO calculations with per-symbol discrepancy reporting.

### Position-Centric Journal

Robinhood reports prediction market trades as separate YES/NO legs. Buying "Team A wins" shows as `YES 100 @ $0.50`, and selling it shows as `NO 100 @ $0.43` — making raw trade logs hard to read.

Eventide groups these into positions:

| What you see | What's underneath |
|--------------|-------------------|
| PHI — Won $27.80 | YES 130 @ $0.79 + NO 130 @ $1.00 (settlement) |
| TENN — Lost $186.00 | YES 400 @ $0.75 + NO 400 @ $0.29 (settlement) |

Click any position to expand and see every leg, fill, and settlement — in chronological order.

### P&L Accuracy

P&L is computed in SQL using Section 5 as the authoritative source, not approximated from trade logs:

- **Per-trade P&L**: Computed from settlement price vs entry price
- **Per-position P&L**: Sourced directly from the statement's Purchase and Sale Summary
- **Validation**: FIFO-calculated P&L is compared against reported figures with a $0.01 tolerance
- **Discrepancy reporting**: Any mismatches are flagged during import preview, before you commit

## Features

### Dashboard

Six metric tiles with trend indicators and sparklines:

- **Net Liquidity** — Total account value over time
- **Realized P&L** — Closed position performance
- **Trading Profit** — Gross P&L minus fees
- **Win Rate** — Wins vs losses with counts
- **Total Fees** — Commission and exchange fee drag
- **Unrealized P&L** — Open position exposure

### Trade Journal

- **Position grouping** — One row per symbol, expandable to individual legs
- **Net P&L per position** — From Section 5 source of truth
- **Filtering** — By date range, category, symbol, P&L range, open/closed status
- **Sorting** — By date, symbol, P&L, fees, category, status
- **Pagination** — 25/50/100 per page
- **CSV export** — Download flat trade data with all fields

### Analytics

- **Category Performance** — Bar chart comparing net P&L across NFL, NBA, Economics, Politics, Golf, and 10+ other categories
- **Volume Treemap** — Visual breakdown of trading volume by category
- **Fee Analysis** — Fee impact by category with drag percentages

### Settings

- **Import History** — View and manage individual statement imports
- **Storage Indicator** — See how much browser storage your data uses
- **Data Export** — Download your complete dataset
- **Default View** — Choose your landing page
- **Data Wipe** — Delete all imported data with confirmation

### Multi-File Upload

- Drag and drop or select multiple PDFs at once
- Sequential parsing with per-file progress
- Aggregate preview with per-file breakdown table
- Per-file duplicate detection with replace or skip options
- Resume remaining files after handling a duplicate

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Database | wa-sqlite with IndexedDB (OPFS) |
| PDF Parsing | pdf.js with custom section parsers |
| State | TanStack Query v5, Zustand |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Testing | Vitest |

## Browser Support

Eventide requires a Chromium-based browser for OPFS (Origin Private File System) support:

| Browser | Supported | Minimum Version |
|---------|-----------|-----------------|
| Chrome | Yes | 119+ |
| Microsoft Edge | Yes | 119+ |
| Brave | Yes | 1.60+ |
| Firefox | No | OPFS not supported |
| Safari | No | OPFS not supported |

## Development

```bash
npm run dev              # Dev server at http://localhost:3000
npm run build            # Production build (static export)
npm run lint             # ESLint
npx tsc --noEmit         # Type check

npm test                 # Vitest watch mode
npm run test:run         # Single run (390+ tests)
npm run test:coverage    # With v8 coverage
```

### Project Structure

```
src/
├── app/(app)/              # Pages: dashboard, trades, analytics, settings, upload
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── dashboard/          # Dashboard tiles and sparklines
│   ├── trade-journal/      # Position table, filters, badges
│   ├── charts/             # Recharts wrappers
│   └── upload/             # File uploader, preview, progress
├── features/               # Cross-cutting: imports, analytics, demo, settings
├── hooks/                  # TanStack Query wrappers
└── lib/
    ├── db/                 # wa-sqlite client, schema, migrations, queries
    ├── parsing/            # PDF section parsers, FIFO, validation
    ├── calculations/       # P&L computation, fee attribution
    └── state/              # Query client, Zustand stores
```

## Contributing

Contributions are welcome. A few ground rules:

- P&L is computed in SQL, never in JavaScript
- All parsing logic is pure TypeScript with no React dependencies
- Named exports only (no default exports except page/config files)
- Run `npm run lint && npx tsc --noEmit && npm run test:run` before submitting a PR
- See [AGENTS.md](AGENTS.md) for detailed code style and architecture guidelines

## License

MIT

---

Your trading data stays on your device. Always.
