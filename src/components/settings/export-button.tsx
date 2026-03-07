"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportDatabase } from "@/lib/db/client";

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const buffer = await exportDatabase();
      const blob = new Blob([buffer.buffer as ArrayBuffer], { type: "application/x-sqlite3" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eventide-backup-${new Date().toISOString().split("T")[0]}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[Settings] Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div>
        <p className="font-medium">Export Database</p>
        <p className="text-sm text-muted-foreground">
          Download your SQLite database file
        </p>
      </div>
      <Button
        variant="outline"
        className="gap-2"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export
      </Button>
    </div>
  );
}
