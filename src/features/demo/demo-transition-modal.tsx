"use client";

/**
 * Demo Transition Modal
 *
 * Shown when a user in demo mode tries to upload a real statement.
 * Confirms that demo data will be replaced with real data.
 */

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

interface DemoTransitionModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DemoTransitionModal({
  open,
  onCancel,
  onConfirm,
}: DemoTransitionModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace demo data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove all demo data and import your real trading
            statement. Your actual trades, P&L, and analytics will replace the
            sample data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Keep exploring demo
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Import my data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
