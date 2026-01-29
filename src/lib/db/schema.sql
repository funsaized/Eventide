-- ============================================================================
-- Rubbin Hood Database Schema
-- Version: 1.0
-- ============================================================================

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Tracks each statement import
CREATE TABLE IF NOT EXISTS statement_imports (
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
CREATE TABLE IF NOT EXISTS trades (
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
CREATE TABLE IF NOT EXISTS closed_positions (
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
CREATE TABLE IF NOT EXISTS cash_flows (
    id TEXT PRIMARY KEY,
    import_id TEXT NOT NULL,

    date DATE NOT NULL,
    type TEXT CHECK(type IN ('DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'FEE', 'ADJUSTMENT')),
    amount DECIMAL(10, 2) NOT NULL,          -- Positive for deposits, negative for withdrawals
    description TEXT,

    FOREIGN KEY (import_id) REFERENCES statement_imports(id) ON DELETE CASCADE
);

-- Open positions (from Section 7)
CREATE TABLE IF NOT EXISTS open_positions (
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
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Duplicate detection tracking
CREATE TABLE IF NOT EXISTS import_duplicates (
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
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_category ON trades(category);
CREATE INDEX IF NOT EXISTS idx_trades_import ON trades(import_id);

-- Closed positions for P&L queries
CREATE INDEX IF NOT EXISTS idx_closed_positions_date ON closed_positions(exit_date);
CREATE INDEX IF NOT EXISTS idx_closed_positions_symbol ON closed_positions(symbol);

-- Cash flows for bankroll calculation
CREATE INDEX IF NOT EXISTS idx_cash_flows_date ON cash_flows(date);
CREATE INDEX IF NOT EXISTS idx_cash_flows_type ON cash_flows(type);

-- Open positions for current portfolio view
CREATE INDEX IF NOT EXISTS idx_open_positions_snapshot ON open_positions(snapshot_date);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Monthly performance summary
CREATE VIEW IF NOT EXISTS monthly_performance AS
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
CREATE VIEW IF NOT EXISTS category_performance AS
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
    CASE
        WHEN SUM(ABS(cp.net_pnl)) > 0
        THEN SUM(CASE WHEN cp.net_pnl > 0 THEN ABS(cp.net_pnl) ELSE 0 END) / SUM(ABS(cp.net_pnl))
        ELSE 0
    END as win_rate_by_volume
FROM closed_positions cp
JOIN trades t ON t.symbol = cp.symbol AND t.import_id = cp.import_id
GROUP BY t.category;

-- Current portfolio health
CREATE VIEW IF NOT EXISTS portfolio_snapshot AS
SELECT
    (SELECT SUM(amount) FROM cash_flows WHERE type = 'DEPOSIT') as total_deposits,
    (SELECT SUM(amount) FROM cash_flows WHERE type = 'WITHDRAWAL') as total_withdrawals,
    (SELECT SUM(net_pnl) FROM closed_positions) as realized_pnl,
    (SELECT SUM(unrealized_pnl) FROM open_positions WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM open_positions)) as unrealized_pnl,
    (SELECT net_liquidity FROM statement_imports ORDER BY statement_date DESC LIMIT 1) as current_net_liquidity;
