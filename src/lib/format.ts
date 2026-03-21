const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatPnl(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${currencyFormatter.format(value)}`;
}

export function formatPercent(value: number, decimals: number = 1): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(decimals)}%`;
}

export function formatPrice(value: number, decimals: number = 2): string {
  return `$${value.toFixed(decimals)}`;
}
