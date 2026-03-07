"use client";

import { useState } from "react";
import { Trash2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { StatementImport } from "@/lib/db/types";

interface ImportHistoryProps {
  imports: StatementImport[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
}

export function ImportHistory({ imports, isLoading, onDelete }: ImportHistoryProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteId);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="font-medium">Import History</p>
        <div className="mt-2 space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="font-medium">Import History</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No statements imported yet
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border p-4">
        <p className="font-medium mb-3">Import History</p>
        <div className="space-y-2">
          {imports.map((imp) => (
            <div
              key={imp.id}
              className="flex items-center justify-between rounded-md border border-border/50 p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {imp.account_number} &mdash; {imp.statement_date}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {imp.platform} &middot; Imported{" "}
                    {new Date(imp.import_timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteId(imp.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Import</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this statement import and all associated
              trades, positions, and cash flows. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
