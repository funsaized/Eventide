"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardGrid } from "@/features/dashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Portfolio Overview Tiles */}
      <DashboardGrid />

      {/* Chart placeholder - will be implemented in Phase 9 */}
      <Card>
        <CardHeader>
          <CardTitle>Net Liquidity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
            Chart will be implemented in Phase 9
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
