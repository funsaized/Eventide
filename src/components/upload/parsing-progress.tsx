"use client";

/**
 * ParsingProgress Component
 *
 * Displays section-by-section parsing progress with status indicators.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ImportPhase } from "@/lib/parsing/core";

export interface ParsingStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
  message?: string;
}

export interface ParsingProgressProps {
  /** Current phase */
  phase: ImportPhase;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current status message */
  message: string;
  /** Individual parsing steps */
  steps?: ParsingStep[];
  /** Custom class name */
  className?: string;
}

const PHASE_LABELS: Record<ImportPhase, string> = {
  PARSING: "Parsing File",
  VALIDATING: "Validating",
  PERSISTING: "Saving to Database",
  COMPLETE: "Complete",
  FAILED: "Failed",
};

function StepIndicator({ status }: { status: ParsingStep["status"] }) {
  return (
    <div
      className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center text-xs",
        status === "pending" && "bg-muted text-muted-foreground",
        status === "active" && "bg-primary text-primary-foreground animate-pulse",
        status === "complete" && "bg-green-600 text-white",
        status === "error" && "bg-destructive text-destructive-foreground"
      )}
    >
      {status === "complete" && "✓"}
      {status === "error" && "✕"}
      {status === "active" && (
        <span className="w-2 h-2 rounded-full bg-primary-foreground" />
      )}
    </div>
  );
}

export function ParsingProgress({
  phase,
  progress,
  message,
  steps,
  className,
}: ParsingProgressProps) {
  const isComplete = phase === "COMPLETE";
  const isFailed = phase === "FAILED";

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {!isComplete && !isFailed && (
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
          {isComplete && <span className="text-green-600">✓</span>}
          {isFailed && <span className="text-destructive">✕</span>}
          {PHASE_LABELS[phase]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <Progress
            value={progress}
            className={cn(
              "h-2",
              isFailed && "[&>div]:bg-destructive"
            )}
          />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* Step list */}
        {steps && steps.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-center gap-3 text-sm"
              >
                <StepIndicator status={step.status} />
                <span
                  className={cn(
                    step.status === "pending" && "text-muted-foreground",
                    step.status === "active" && "text-foreground font-medium",
                    step.status === "complete" && "text-muted-foreground",
                    step.status === "error" && "text-destructive"
                  )}
                >
                  {step.label}
                </span>
                {step.message && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {step.message}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Generate default parsing steps based on current phase
 */
export function generateDefaultSteps(phase: ImportPhase): ParsingStep[] {
  const phases: ImportPhase[] = [
    "PARSING",
    "VALIDATING",
    "PERSISTING",
  ];

  const currentIndex = phases.indexOf(phase);

  return phases.map((p, index) => ({
    id: p,
    label: PHASE_LABELS[p],
    status:
      phase === "FAILED"
        ? index < currentIndex
          ? "complete"
          : index === currentIndex
          ? "error"
          : "pending"
        : index < currentIndex
        ? "complete"
        : index === currentIndex
        ? "active"
        : "pending",
  }));
}
