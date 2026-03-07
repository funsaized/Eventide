"use client";

import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StorageEstimate {
  usage: number;
  quota: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function StorageIndicator() {
  const [storage, setStorage] = useState<StorageEstimate | null>(null);

  useEffect(() => {
    async function estimate() {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          setStorage({
            usage: est.usage ?? 0,
            quota: est.quota ?? 0,
          });
        }
      } catch {
        // Storage API not available
      }
    }
    estimate();
  }, []);

  const percent = storage && storage.quota > 0
    ? Math.round((storage.usage / storage.quota) * 100)
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <HardDrive className="h-4 w-4" />
          Storage Used
        </span>
        <span className="font-mono tabular-nums">
          {storage
            ? `${formatBytes(storage.usage)} / ${formatBytes(storage.quota)}`
            : "Estimating..."}
        </span>
      </div>
      <Progress value={percent} className="h-2" />
      <p className="text-xs text-muted-foreground">
        Browser-local storage via IndexedDB. Data never leaves your device.
      </p>
    </div>
  );
}
