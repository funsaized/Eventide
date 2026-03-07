"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
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
import {
  SettingsSection,
  DefaultViewSelector,
  ExportButton,
  StorageIndicator,
  ImportHistory,
} from "@/components/settings";
import { useImportHistory, useDeleteImport, useDeleteAllData } from "@/hooks/use-settings-data";
import { useToast } from "@/hooks/use-toast";

export function SettingsView() {
  const { toast } = useToast();
  const { data: imports = [], isLoading } = useImportHistory();
  const deleteImport = useDeleteImport();
  const deleteAll = useDeleteAllData();
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  async function handleDeleteImport(id: string) {
    try {
      await deleteImport.mutateAsync(id);
      toast({ title: "Import Deleted", description: "Statement import removed successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to delete import.", variant: "destructive" });
    }
  }

  async function handleDeleteAll() {
    try {
      await deleteAll.mutateAsync();
      setShowDeleteAll(false);
      toast({ title: "All Data Deleted", description: "All imported data has been removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete data.", variant: "destructive" });
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Preferences */}
      <SettingsSection title="Preferences">
        <DefaultViewSelector />
      </SettingsSection>

      {/* Data Management */}
      <SettingsSection title="Data Management">
        <StorageIndicator />
        <ExportButton />
        <ImportHistory
          imports={imports}
          isLoading={isLoading}
          onDelete={handleDeleteImport}
        />
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection title="Danger Zone" variant="danger">
        <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
          <div>
            <p className="font-medium">Delete All Data</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete all imported statements and trades
            </p>
          </div>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setShowDeleteAll(true)}
            disabled={imports.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </SettingsSection>

      {/* Version */}
      <div className="text-center text-sm text-muted-foreground">
        Eventide v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"}
      </div>

      {/* Delete All Confirmation */}
      <AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all imported statements, trades, positions,
              and cash flows. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAll.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={deleteAll.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAll.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
