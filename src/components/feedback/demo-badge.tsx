"use client";

/**
 * Demo Badge
 *
 * Shows a subtle indicator when the app is in demo mode.
 * Includes a CTA to upload real data.
 */

import Link from "next/link";
import { FlaskConical, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserPreferencesStore } from "@/lib/state/stores";

export function DemoBadge() {
  const isDemo = useUserPreferencesStore((s) => s.isDemo);

  if (!isDemo) return null;

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="gap-1 border-warning/50 text-warning"
      >
        <FlaskConical className="h-3 w-3" />
        Demo
      </Badge>
      <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground">
        <Link href="/upload">
          <Upload className="h-3 w-3" />
          Try with your data
        </Link>
      </Button>
    </div>
  );
}
