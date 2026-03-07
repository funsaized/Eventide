"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const WARNING_THRESHOLD = 0.8; // 80%

export function StorageWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [usagePercent, setUsagePercent] = useState(0);

  useEffect(() => {
    async function check() {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          const usage = est.usage ?? 0;
          const quota = est.quota ?? 1;
          const pct = usage / quota;
          if (pct >= WARNING_THRESHOLD) {
            setShowWarning(true);
            setUsagePercent(Math.round(pct * 100));
          }
        }
      } catch {
        // Storage API not available
      }
    }
    check();
  }, []);

  if (!showWarning) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Storage Almost Full</AlertTitle>
      <AlertDescription>
        Browser storage is {usagePercent}% full. Consider exporting and deleting
        old imports from Settings to free up space.
      </AlertDescription>
    </Alert>
  );
}
