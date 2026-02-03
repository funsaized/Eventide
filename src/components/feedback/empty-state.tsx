"use client";

/**
 * Empty State Component
 *
 * Displays when there's no data to show, with optional call to action.
 */

import { FileUp, BarChart3, TrendingUp, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

type EmptyStateVariant = "dashboard" | "trades" | "analytics" | "generic";

interface EmptyStateProps {
  /** Variant determines the icon and default messaging */
  variant?: EmptyStateVariant;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Whether to show the action button */
  showAction?: boolean;
  /** Custom action button text */
  actionText?: string;
  /** Custom action button href */
  actionHref?: string;
  /** Callback for action button (alternative to href) */
  onAction?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const VARIANT_CONFIG = {
  dashboard: {
    icon: TrendingUp,
    title: "No data yet",
    description:
      "Import your first statement to see your portfolio performance, P&L metrics, and trading insights.",
    actionText: "Import Statement",
    actionHref: "/upload",
  },
  trades: {
    icon: BarChart3,
    title: "No trades found",
    description:
      "Import a statement to view your trade history, or adjust your filters to see different results.",
    actionText: "Import Statement",
    actionHref: "/upload",
  },
  analytics: {
    icon: BarChart3,
    title: "No analytics available",
    description:
      "Import statements to unlock performance analytics, category breakdowns, and fee analysis.",
    actionText: "Import Statement",
    actionHref: "/upload",
  },
  generic: {
    icon: Database,
    title: "No data available",
    description: "There's nothing to display here yet.",
    actionText: "Get Started",
    actionHref: "/upload",
  },
};

/**
 * Empty state component for pages/sections with no data
 */
export function EmptyState({
  variant = "generic",
  title,
  description,
  showAction = true,
  actionText,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;
  const displayActionText = actionText ?? config.actionText;
  const displayActionHref = actionHref ?? config.actionHref;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      {/* Icon container with subtle background */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        {displayTitle}
      </h3>

      {/* Description */}
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {displayDescription}
      </p>

      {/* Action button */}
      {showAction && (
        <>
          {onAction ? (
            <Button onClick={onAction}>
              <FileUp className="mr-2 h-4 w-4" />
              {displayActionText}
            </Button>
          ) : (
            <Button asChild>
              <Link href={displayActionHref}>
                <FileUp className="mr-2 h-4 w-4" />
                {displayActionText}
              </Link>
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export type { EmptyStateProps, EmptyStateVariant };
