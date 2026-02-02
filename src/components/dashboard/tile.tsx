import * as React from "react";
import { cn } from "@/lib/utils";

interface TileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variant affects the visual prominence */
  variant?: "default" | "primary";
}

/**
 * Base Tile component with glass effect for dashboard metrics.
 * Uses a subtle gradient background with border glow on hover.
 */
const Tile = React.forwardRef<HTMLDivElement, TileProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "relative rounded-lg border p-4",
          // Glass effect with gradient
          "bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm",
          // Border styling
          "border-border/50",
          // Transition for hover effects
          "transition-all duration-200",
          // Hover state - subtle glow
          "hover:border-border hover:shadow-lg hover:shadow-primary/5",
          // Primary variant styling
          variant === "primary" && [
            "border-primary/30",
            "hover:border-primary/50 hover:shadow-primary/10",
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Tile.displayName = "Tile";

export { Tile };
export type { TileProps };
