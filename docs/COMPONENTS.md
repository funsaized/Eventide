# Component Inventory - Rubbin Hood MVP

## Legend
- [ ] = Not started
- [x] = Complete
- ✅ = Can use shadcn/ui directly
- 🔧 = Needs customization of shadcn/ui base
- 🎨 = Fully custom component

---

## 1. Layout Components

### AppShell
- [x] 🎨 **AppShell** - Main layout wrapper
  - Props: `children`, `title`
  - Contains: Sidebar, TopBar, main content area

### Navigation
- [x] 🔧 **Sidebar** - Collapsible nav sidebar
  - Props: `className`
  - Desktop: fixed sidebar, Mobile: Sheet drawer
  - Base: shadcn Sheet + custom styling

- [x] 🔧 **NavItem** - Sidebar navigation link
  - Props: `href`, `icon`, `label`
  - States: default, hover, active (auto-detected from pathname)
  - Base: shadcn Button (ghost variant) + custom

- [x] 🔧 **TopBar** - App header bar
  - Props: `title`
  - Contains: page title, upload button, mobile menu trigger

---

## 2. Dashboard Tiles

### Base Tile
- [x] 🔧 **Tile** - Dashboard metric card container
  - Props: `title`, `tooltip`, `children`
  - Base: shadcn Card + glass effect gradient
  - Variants: default, compact

- [x] 🔧 **TileHeader** - Tile title area
  - Props: `title`, `tooltip`
  - Contains: TileTitle + TileTooltip

- [x] ✅ **TileTooltip** - Info tooltip on tiles
  - Props: `content`
  - Use: shadcn Tooltip directly

- [x] 🎨 **TileValue** - Large metric display
  - Props: `value`, `prefix`, `suffix`, `trend`
  - Variants: positive, negative, neutral

- [x] 🎨 **TileTrend** - Trend indicator
  - Props: `value`, `direction`
  - Variants: up (green), down (red), flat (muted)

- [x] 🎨 **TileSparkline** - Mini chart in tile
  - Props: `data: {value, date}[]`
  - Library: Recharts sparkline

### Specific Tiles
- [x] 🎨 **NetLiquidityTile** - Net liquidity metric
- [x] 🎨 **RealizedPnLTile** - Realized P&L metric
- [x] 🎨 **UnrealizedPnLTile** - Unrealized P&L metric
- [x] 🎨 **TotalFeesTile** - Total fees metric
- [x] 🎨 **TradingProfitTile** - Trading profit metric
- [x] 🎨 **WinRateTile** - Win rate metric (toggleable count/volume)
  - Props: `mode: "count" | "volume"`, `onToggle`

---

## 3. Trade Journal Components

### Data Table
- [ ] 🔧 **TradeTable** - Main trade journal table
  - Props: `data`, `columns`, `filters`, `sorting`
  - Base: shadcn Table + TanStack Table v8
  - Features: sorting, pagination, virtual scroll

- [ ] ✅ **TableHeader** - Column headers with sort
  - Use: shadcn TableHeader

- [ ] ✅ **TableRow** - Table row
  - Use: shadcn TableRow

- [ ] ✅ **TableCell** - Table cell
  - Use: shadcn TableCell

- [ ] ✅ **TablePagination** - Page navigation
  - Props: `page`, `pageSize`, `total`, `onChange`
  - Base: shadcn Pagination

### Data Display
- [ ] 🎨 **PnLBadge** - Profit/loss indicator
  - Props: `value: number`
  - Variants: positive (green), negative (red), neutral
  - Shows: formatted currency with +/- sign

- [ ] 🎨 **CategoryPill** - Category tag
  - Props: `category`, `onClick`
  - Variants: NFL, NBA, Economics, Tennis, Politics, Uncategorized
  - Each category has unique color

- [ ] 🎨 **SideBadge** - YES/NO indicator
  - Props: `side: "YES" | "NO"`
  - Variants: YES (profit color), NO (loss color)

- [ ] 🎨 **StatusBadge** - Open/Closed status
  - Props: `status: "OPEN" | "CLOSED"`
  - Variants: open, closed

### Filters
- [ ] 🎨 **FilterBar** - Filter controls container
  - Props: `filters`, `onFilterChange`
  - Contains: FilterBuilder, filter chips

- [ ] 🎨 **FilterBuilder** - Advanced filter UI
  - Props: `filters`, `onChange`
  - Supports: AND/OR composition

- [ ] 🔧 **FilterGroup** - Filter group (AND/OR)
  - Props: `logic`, `filters`, `onRemove`
  - Base: shadcn Card

- [ ] 🔧 **DateRangeFilter** - Date range picker
  - Props: `start`, `end`, `onChange`
  - Base: shadcn DatePicker + Popover

- [ ] 🔧 **CategoryFilter** - Multi-select categories
  - Props: `selected`, `options`, `onChange`
  - Base: shadcn Select (multi)

- [ ] 🔧 **PnLRangeFilter** - P&L min/max slider
  - Props: `min`, `max`, `onChange`
  - Base: shadcn Slider + Input

- [ ] 🎨 **FilterChip** - Active filter indicator
  - Props: `label`, `value`, `onRemove`

---

## 4. Charts & Analytics

### Chart Wrappers
- [x] 🎨 **TimeSeriesChart** - Line chart for trends
  - Props: `data`, `xKey`, `yKey`, `height`
  - Library: Recharts LineChart
  - Features: tooltip, responsive

- [ ] 🎨 **CategoryPerformanceChart** - Horizontal bar chart
  - Props: `data`, `onClick`
  - Library: Recharts BarChart
  - Features: drill-down on click

- [ ] 🎨 **VolumeTreemap** - Volume distribution
  - Props: `data`
  - Library: Recharts Treemap
  - Colors: green for positive, red for negative

- [ ] 🎨 **FeeAnalysisChart** - Stacked bar + line
  - Props: `data`
  - Library: Recharts ComposedChart
  - Shows: commission vs exchange fees + cumulative

- [x] 🎨 **Sparkline** - Mini inline chart
  - Props: `data`, `width`, `height`
  - Library: Recharts (simplified)

### Chart Utilities
- [x] 🎨 **ChartTooltip** - Custom chart tooltip
  - Props: `active`, `payload`, `label`

- [ ] 🎨 **ChartLegend** - Chart legend
  - Props: `items`

---

## 5. Upload Flow Components

### File Handling
- [ ] 🎨 **FileUploader** - Drag-and-drop file upload
  - Props: `onFileSelect`, `accept`, `maxSize`
  - States: idle, dragover, uploading, error

- [ ] 🎨 **ParsingProgress** - Upload progress indicator
  - Props: `progress`, `status`, `message`
  - Shows: progress bar + section status

- [ ] 🎨 **ParseErrorReport** - Section-by-section status
  - Props: `errors: ParseError[]`, `warnings`
  - Shows: per-section success/failure with icons

- [ ] 🎨 **ImportPreview** - Pre-import summary
  - Props: `tradeCount`, `netLiquidity`, `period`, `onImport`
  - Shows: extracted data summary

### Modals
- [ ] 🔧 **DuplicateModal** - Duplicate detection dialog
  - Props: `existingImport`, `onReplace`, `onKeepBoth`, `onCancel`
  - Base: shadcn AlertDialog

- [ ] 🔧 **ValidationWarningModal** - P&L discrepancy warning
  - Props: `discrepancies`, `onContinue`, `onCancel`
  - Base: shadcn AlertDialog

---

## 6. Feedback & Status Components

- [x] ✅ **Toast** - Notification toast
  - Use: shadcn Toast (Sonner)

- [x] ✅ **Progress** - Progress bar
  - Use: shadcn Progress

- [ ] 🔧 **LoadingSpinner** - Loading indicator
  - Props: `size`
  - Variants: sm, md, lg

- [x] 🎨 **Skeleton** - Loading placeholder
  - Props: `type: "tile" | "table" | "chart"`
  - Variants: different shapes per type

- [x] 🎨 **EmptyState** - No data placeholder
  - Props: `icon`, `title`, `description`, `action`

- [ ] 🎨 **ErrorState** - Error display
  - Props: `error`, `onRetry`

---

## 7. Form Components (shadcn/ui direct)

- [ ] ✅ **Button** - Action buttons
  - Variants: default, outline, ghost, destructive
  - Sizes: sm, default, lg, icon

- [ ] ✅ **Input** - Text input
  - Use: shadcn Input

- [ ] ✅ **Select** - Dropdown select
  - Use: shadcn Select

- [ ] ✅ **Checkbox** - Checkbox input
  - Use: shadcn Checkbox

- [ ] ✅ **Switch** - Toggle switch
  - Use: shadcn Switch

- [ ] ✅ **Label** - Form label
  - Use: shadcn Label

---

## 8. Overlay Components (shadcn/ui direct)

- [ ] ✅ **Dialog** - Modal dialog
  - Use: shadcn Dialog

- [ ] ✅ **AlertDialog** - Confirmation dialog
  - Use: shadcn AlertDialog

- [ ] ✅ **Popover** - Popup content
  - Use: shadcn Popover

- [ ] ✅ **Tooltip** - Hover tooltip
  - Use: shadcn Tooltip

- [ ] ✅ **DropdownMenu** - Action menu
  - Use: shadcn DropdownMenu

- [ ] ✅ **Sheet** - Slide-out panel
  - Use: shadcn Sheet (for mobile filters)

---

## 9. Settings Components

- [ ] 🔧 **SettingsSection** - Settings group
  - Props: `title`, `description`, `children`
  - Base: shadcn Card

- [ ] ✅ **ThemeToggle** - Theme switch (future)
  - Use: shadcn Switch

- [ ] 🔧 **DefaultViewSelector** - Default page select
  - Props: `value`, `onChange`
  - Base: shadcn RadioGroup

- [ ] 🔧 **ExportButton** - Database export
  - Props: `onExport`
  - Base: shadcn Button + download logic

- [ ] 🎨 **StorageIndicator** - OPFS usage display
  - Props: `usedBytes`, `totalBytes`

---

## 10. Marketing/Landing Components

- [ ] 🎨 **Hero** - Landing page hero
  - Props: `title`, `subtitle`, `cta`

- [ ] 🎨 **FeatureCard** - Feature highlight
  - Props: `icon`, `title`, `description`

- [ ] 🔧 **CTA** - Call-to-action section
  - Props: `title`, `buttonText`, `onClick`
  - Base: shadcn Button

---

## 11. Browser Compatibility Components

- [ ] 🎨 **BrowserBlocker** - Unsupported browser overlay
  - Props: none (full-screen overlay)
  - Shows: error message + Chrome download link

- [ ] 🔧 **StorageWarning** - Low storage alert
  - Props: `usagePercent`
  - Base: shadcn Alert variant

---

## Summary

| Category | shadcn Direct | Customized | Fully Custom | Total |
|----------|---------------|------------|--------------|-------|
| Layout | 0 | 3 | 1 | 4 |
| Dashboard Tiles | 1 | 2 | 10 | 13 |
| Trade Journal | 4 | 5 | 7 | 16 |
| Charts | 0 | 0 | 8 | 8 |
| Upload Flow | 0 | 2 | 4 | 6 |
| Feedback/Status | 2 | 1 | 4 | 7 |
| Forms | 6 | 0 | 0 | 6 |
| Overlays | 6 | 0 | 0 | 6 |
| Settings | 1 | 3 | 1 | 5 |
| Marketing | 0 | 1 | 2 | 3 |
| Browser | 0 | 1 | 1 | 2 |
| **TOTAL** | **20** | **18** | **38** | **76** |

---

## Implementation Priority (MVP)

### Phase 1 - Core Infrastructure
1. [ ] Button, Input, Select, Label (shadcn)
2. [ ] Dialog, AlertDialog, Tooltip, Popover (shadcn)
3. [ ] AppShell, Sidebar, NavItem, TopBar

### Phase 2 - Upload Flow
4. [ ] FileUploader
5. [ ] ParsingProgress, ParseErrorReport
6. [ ] ImportPreview, DuplicateModal
7. [ ] Toast, Progress, LoadingSpinner

### Phase 3 - Dashboard
8. [ ] Tile, TileHeader, TileValue, TileTrend
9. [ ] TileSparkline, Sparkline
10. [ ] All 6 specific tiles
11. [ ] TimeSeriesChart

### Phase 4 - Trade Journal
12. [ ] TradeTable (with TanStack Table)
13. [ ] PnLBadge, CategoryPill, SideBadge, StatusBadge
14. [ ] FilterBar, FilterBuilder, all filter components

### Phase 5 - Analytics
15. [ ] CategoryPerformanceChart
16. [ ] VolumeTreemap
17. [ ] FeeAnalysisChart

### Phase 6 - Polish
18. [ ] Settings components
19. [ ] EmptyState, ErrorState, Skeleton
20. [ ] BrowserBlocker, StorageWarning
21. [ ] Marketing components (if needed)

---

## shadcn/ui Components to Install

```bash
# Core form components
pnpm dlx shadcn@latest add button input label select checkbox switch

# Overlay components
pnpm dlx shadcn@latest add dialog alert-dialog popover tooltip dropdown-menu sheet

# Data display
pnpm dlx shadcn@latest add table card badge

# Feedback
pnpm dlx shadcn@latest add progress sonner alert skeleton

# Navigation
pnpm dlx shadcn@latest add tabs

# Filters
pnpm dlx shadcn@latest add slider calendar
```

---

## File Structure

```
src/components/
├── ui/                    # shadcn/ui generated components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── layout/
│   ├── app-shell.tsx
│   ├── sidebar.tsx
│   ├── nav-item.tsx
│   └── top-bar.tsx
├── dashboard/
│   ├── tile.tsx
│   ├── tile-value.tsx
│   ├── tile-trend.tsx
│   ├── tile-sparkline.tsx
│   └── tiles/
│       ├── net-liquidity-tile.tsx
│       ├── realized-pnl-tile.tsx
│       └── ...
├── charts/
│   ├── time-series-chart.tsx
│   ├── category-performance-chart.tsx
│   ├── volume-treemap.tsx
│   ├── fee-analysis-chart.tsx
│   ├── sparkline.tsx
│   └── chart-tooltip.tsx
├── trade-journal/
│   ├── trade-table.tsx
│   ├── pnl-badge.tsx
│   ├── category-pill.tsx
│   ├── side-badge.tsx
│   ├── status-badge.tsx
│   └── filters/
│       ├── filter-bar.tsx
│       ├── filter-builder.tsx
│       ├── date-range-filter.tsx
│       ├── category-filter.tsx
│       ├── pnl-range-filter.tsx
│       └── filter-chip.tsx
├── upload/
│   ├── file-uploader.tsx
│   ├── parsing-progress.tsx
│   ├── parse-error-report.tsx
│   ├── import-preview.tsx
│   ├── duplicate-modal.tsx
│   └── validation-warning-modal.tsx
├── feedback/
│   ├── loading-spinner.tsx
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   └── skeleton-loaders.tsx
├── settings/
│   ├── settings-section.tsx
│   ├── default-view-selector.tsx
│   ├── export-button.tsx
│   └── storage-indicator.tsx
├── marketing/
│   ├── hero.tsx
│   ├── feature-card.tsx
│   └── cta.tsx
└── browser/
    ├── browser-blocker.tsx
    └── storage-warning.tsx
```
