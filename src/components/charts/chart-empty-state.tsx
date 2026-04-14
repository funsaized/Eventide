/**
 * Shared empty state for chart containers.
 */

interface ChartEmptyStateProps {
  height: number;
  label?: string;
}

function ChartEmptyState({
  height,
  label = "No data available",
}: ChartEmptyStateProps) {
  return (
    <div
      style={{ height }}
      role="img"
      aria-label={label || "No data available"}
    >
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export { ChartEmptyState };
export type { ChartEmptyStateProps };
