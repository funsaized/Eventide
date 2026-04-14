# Parsing Layer

PDF/CSV statement parsing. Pure TypeScript — zero React dependencies.

## Architecture

```
parsing/
├── core/           # Platform-agnostic abstractions (ImporterRegistry, types)
├── robinhood/      # PDF parser: sections/, parsers/, import-pipeline
├── kalshi/         # CSV parser: csv-parser, transform, import-pipeline
├── register.ts     # Side-effect imports that register platform importers
├── symbol.ts       # Symbol parsing + categorization (593 lines)
└── types.ts        # Shared parsing types
```

### Platform Dispatch

`ImporterRegistry` (singleton in `core/`) routes files to the correct platform importer. Registration happens via side-effect imports in `register.ts`:

```typescript
// register.ts — import this file to activate all importers
import "@/lib/parsing/robinhood/importer";  // self-registers on import
import "@/lib/parsing/kalshi/importer";     // self-registers on import
```

Upload flow imports `register.ts` before calling `importerRegistry.getImporter(file)`.

## Robinhood Pipeline

```
PDF → pdf.js → TextItems → detectSections() → Section Parsers → Trades/Positions
                                                      ↓
                                               FIFO P&L Validation
                                                      ↓
                                               Database Import
```

### Section Parsers (`robinhood/sections/`)

| Section | File | Parses |
|---------|------|--------|
| 2 | `section2.ts` | Monthly trade confirmations (individual trades) |
| 3 | `section3.ts` | Non-trade activity records |
| 4 | `section4.ts` | Prior-period settlements, closing trades |
| 5 | `section5.ts` | Purchase & Sale summary — **P&L source of truth** |
| 6 | `section6.ts` | Journal entries (deposits, withdrawals, interest) |
| 7 | `section7.ts` | Open positions with market value |
| 10 | `section10.ts` | Account summary (net liquidity, fees) |

### Column Calibration (`sections/columns.ts` — 981 lines)

PDF text items have absolute x/y coordinates. `columns.ts` calibrates column positions per section using percentage-based offsets from header row anchors. Flow:

1. `findHeaderRow()` — locate header text items
2. `calibrateColumns()` — compute column boundaries from header positions
3. `assignToColumn()` — map each text item to its column
4. `groupIntoRows()` — cluster items by y-coordinate into data rows

### Versioned Parsers (`robinhood/parsers/`)

Statement format changes over time. Parsers implement `StatementParser` interface (`canParse()` + `parse()`). Version detection in `registry.ts` selects the correct parser.

## Kalshi Pipeline

```
CSV → parse rows → transform → Trades/CashFlows → Database Import
```

Simpler than Robinhood: CSV with headers, no coordinate math. `transform.ts` converts parsed rows to database-ready records.

## Constraints (CRITICAL)

- **Page boundary isolation** — Items on different PDF pages are NEVER grouped into the same row. Enforced in `pdf-loader.ts` and `columns.ts`.
- **Sells = opposite-side buys** — Robinhood "selling" = "buying the opposite side" (YES+NO=$1.00). `import-pipeline.ts` pairs these.
- **settlement_price on OPEN trade** — Kalshi `settlement_price` must be placed on the OPEN trade for SQL P&L to compute correctly. See `kalshi/transform.ts`.
- **FIFO ordering** — Same-date OPEN trades must process before CLOSE/SETTLE. See `calculations/fifo.ts`.
- **Sections 2 & 4 deduplicate** — Trades appear in both sections; `import-pipeline.ts` deduplicates by trade ID.

## Adding a New Platform

1. Create `src/lib/parsing/<platform>/importer.ts` implementing `PlatformImporter`
2. Self-register in the importer file: `importerRegistry.register(new MyImporter())`
3. Add side-effect import in `register.ts`: `import "@/lib/parsing/<platform>/importer"`
4. Create `import-pipeline.ts` for orchestration
5. Add tests in `tests/unit/parsing/`
