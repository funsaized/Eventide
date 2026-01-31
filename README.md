# Eventide

**Local-first analytics platform for prediction market trading**

Eventide is a privacy-preserving analytics platform that helps prediction market traders understand their true performance. Import your Robinhood Derivatives monthly statements and get insights into P&L, win rates, category performance, and fee drag—all processed locally in your browser.

## Privacy First

Your financial data is sensitive. Eventide is designed from the ground up to keep it private:

| Principle | Implementation |
|-----------|----------------|
| **No Server Upload** | PDFs are parsed entirely in your browser using WebAssembly. Your statements never leave your device. |
| **No Cloud Database** | All data is stored locally in your browser's IndexedDB. There is no server to breach. |
| **No Telemetry** | Zero analytics, tracking pixels, or usage monitoring. No user identification or trade data collection. |
| **No Account Required** | No email, no login, no personal information collected—ever. |
| **Open Source** | The code is fully auditable. Verify privacy claims directly in the source. |
| **Offline Capable** | After initial load, the app works without internet. Your data stays air-gapped if desired. |

**The only network requests Eventide makes are to load the application itself.** Once loaded, all PDF parsing, calculations, and data storage happen entirely within your browser's sandbox.

## Why Eventide?

Traders lack visibility into their true performance because data is locked in static PDF statements. Eventide ingests those PDFs locally to reveal:

- **True cost of trading** — separating fees from P&L
- **Cash flow separation** — skill/ROI vs capital injections
- **Category-based insights** — which market types are profitable
- **Historical performance trends** — time-series analysis

## Key Features

- **100% Local-First**: All data processing happens in-browser, zero server dependencies
- **Privacy-Preserving**: No cloud extraction, no telemetry, no user tracking
- **Robinhood Derivatives Support**: Parse monthly statements with full trade detail
- **P&L Validation**: Cross-reference calculated P&L against statement figures

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Database**: wa-sqlite with IndexedDB persistence (OPFS planned)
- **PDF Parsing**: pdf.js with custom section parsers
- **State Management**: TanStack Query + Zustand
- **Charts**: Recharts (planned)

## Browser Support

Eventide requires a Chromium-based browser for local data persistence:

- ✅ Chrome 119+
- ✅ Microsoft Edge 119+
- ✅ Brave 1.60+
- ❌ Firefox (not supported)
- ❌ Safari (not supported)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/snimmagadda1/rubbin-hood.git
cd rubbin-hood

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in a Chromium-based browser.

### Running Tests

```bash
# Run unit tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (app)/              # Main application routes
│   │   ├── dashboard/      # Portfolio overview
│   │   ├── trades/         # Trade journal
│   │   ├── analytics/      # Performance charts
│   │   └── settings/       # User preferences
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # App shell, sidebar, navigation
│   └── browser/            # Browser compatibility checks
├── lib/
│   ├── db/                 # Database layer (wa-sqlite)
│   │   ├── client.ts       # Database connection
│   │   ├── schema.ts       # Table definitions
│   │   ├── migrations/     # Schema migrations
│   │   └── queries/        # Query functions
│   ├── parsing/            # PDF parsing engine
│   │   ├── pdf-loader.ts   # pdf.js wrapper
│   │   ├── sections/       # Section-specific parsers
│   │   ├── parsers/        # Versioned parser implementations
│   │   └── registry.ts     # Parser version detection
│   └── state/              # TanStack Query + Zustand
└── tests/                  # Test suites
```

## Development Status

Eventide is under active development. See [PHASES.md](docs/PHASES.md) for detailed progress.

### Completed Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project Foundation | ✅ Complete |
| 2 | App Shell & Routing | ✅ Complete |
| 3 | Database Layer | ✅ Complete |
| 4 | PDF Parsing Foundation | ✅ Complete |
| 5 | Section Parsers (Trades & P&L) | ✅ Complete |

### Current Progress

- **Section 2 Parser**: Monthly Trade Confirmations (trades, settlements)
- **Section 4 Parser**: Purchase and Sale (includes prior-month settlements)
- **Section 5 Parser**: Purchase and Sale Summary (P&L source of truth)
- **Trade Deduplication**: Cross-references Sections 2 & 4 to avoid double-counting
- **Symbol Categorization**: 15+ market categories (NFL, NBA, Economics, Politics, etc.)

### Upcoming Phases

| Phase | Description |
|-------|-------------|
| 6 | Complete Parsing Pipeline (FIFO, validation) |
| 7 | Upload Flow UI |
| 8-9 | Dashboard with real data |
| 10-11 | Trade Journal with filters |
| 12 | Analytics Charts |
| 13 | Demo Mode |
| 14-16 | Settings, Testing, Deployment |

## Statement Parsing

Eventide parses Robinhood Derivatives monthly statements which contain:

| Section | Content | Parser Status |
|---------|---------|---------------|
| 2 | Monthly Trade Confirmations | ✅ Implemented |
| 4 | Purchase and Sale | ✅ Implemented |
| 5 | Purchase and Sale Summary | ✅ Implemented |
| 6 | Journal Entries (cash flows) | 🔲 Planned |
| 7 | Open Positions | 🔲 Planned |
| 10 | Account Summary | 🔲 Planned |

### P&L Calculation Strategy

Section 5 is the **source of truth** for P&L figures. The parser:

1. Extracts all trades from Section 2 (current month) and Section 4 (includes prior months)
2. Deduplicates trades that appear in both sections
3. Pairs YES/NO rows in Section 5 to calculate net P&L per position
4. Validates calculated P&L against statement figures (±$0.01 tolerance)

## Documentation

- [Product Requirements (spec-v3.md)](docs/spec-v3.md) — Full PRD with architecture decisions
- [Implementation Phases](docs/PHASES.md) — Detailed phase tracking
- [Design System](docs/DESIGN-SYSTEM.md) — Dark Monarch theme and component guidelines
- [Package Dependencies](docs/PACKAGES.md) — Dependency decisions and rationale

## Contributing

Contributions are welcome! Please read the existing documentation before submitting PRs.

### Development Guidelines

- All parsing logic is pure TypeScript (no React dependencies)
- UI never executes raw SQL directly—use `lib/db/queries/*`
- Run `pnpm lint` and `pnpm test` before committing

## License

MIT

---

Built with privacy in mind. Your trading data never leaves your browser.
