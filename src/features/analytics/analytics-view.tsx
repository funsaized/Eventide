"use client";

/**
 * Analytics View
 *
 * Main analytics page layout with category performance, volume treemap,
 * and fee analysis charts.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryPerformanceChart } from "@/components/charts/category-performance-chart";
import { VolumeTreemap } from "@/components/charts/volume-treemap";
import { FeeAnalysisChart } from "@/components/charts/fee-analysis-chart";
import { ChartLegend } from "@/components/charts/chart-legend";
import { EmptyState } from "@/components/feedback/empty-state";
import { ChartSkeleton } from "@/components/feedback/skeleton-loaders";
import {
  useCategoryPerformanceChart,
  useVolumeDistribution,
  useFeeAnalysis,
} from "@/hooks/use-analytics-data";
import { useHasData } from "@/hooks/use-dashboard-data";

export function AnalyticsView() {
  const { data: hasData, isLoading: hasDataLoading } = useHasData();
  const categoryQuery = useCategoryPerformanceChart();
  const volumeQuery = useVolumeDistribution();
  const feeQuery = useFeeAnalysis();

  const isLoading =
    hasDataLoading ||
    categoryQuery.isLoading ||
    volumeQuery.isLoading ||
    feeQuery.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton height={380} />
          <ChartSkeleton height={380} />
        </div>
        <ChartSkeleton height={380} />
      </div>
    );
  }

  if (!hasData) {
    return <EmptyState variant="analytics" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Performance</CardTitle>
            <p className="text-xs text-muted-foreground">
              Net P&L by category. Click a bar to view trades.
            </p>
          </CardHeader>
          <CardContent>
            <CategoryPerformanceChart
              data={categoryQuery.data ?? []}
              height={280}
            />
          </CardContent>
        </Card>

        {/* Volume Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Volume Distribution
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Trading volume by category
                </p>
              </div>
              <ChartLegend
                items={[
                  {
                    label: "Profitable",
                    color: "oklch(0.65 0.2 145)",
                    type: "square",
                  },
                  {
                    label: "Unprofitable",
                    color: "oklch(0.65 0.2 25)",
                    type: "square",
                  },
                ]}
              />
            </div>
          </CardHeader>
          <CardContent>
            <VolumeTreemap data={volumeQuery.data ?? []} height={280} />
          </CardContent>
        </Card>
      </div>

      {/* Fee Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fee Analysis</CardTitle>
          <p className="text-xs text-muted-foreground">
            Monthly fee breakdown with cumulative total
          </p>
        </CardHeader>
        <CardContent>
          <FeeAnalysisChart data={feeQuery.data ?? []} height={280} />
        </CardContent>
      </Card>
    </div>
  );
}
