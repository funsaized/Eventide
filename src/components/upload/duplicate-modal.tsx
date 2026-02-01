"use client";

/**
 * DuplicateModal Component
 *
 * Modal for handling duplicate statement detection.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface DuplicateInfo {
  existingId: string;
  existingDate: string;
}

export interface DuplicateModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Duplicate information */
  duplicate: DuplicateInfo;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Callback when user chooses to replace */
  onReplace: () => void;
  /** Whether replace operation is in progress */
  isReplacing?: boolean;
}

export function DuplicateModal({
  open,
  duplicate,
  onCancel,
  onReplace,
  isReplacing = false,
}: DuplicateModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Statement Detected</DialogTitle>
          <DialogDescription>
            A statement for this account and date already exists.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm">
              <span className="text-muted-foreground">Existing Import ID:</span>
              <span className="ml-2 font-mono">{duplicate.existingId}</span>
            </p>
            <p className="text-sm mt-1">
              <span className="text-muted-foreground">Statement Date:</span>
              <span className="ml-2">{duplicate.existingDate}</span>
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Would you like to replace the existing import with the new data?
            This will delete all trades, positions, and cash flows from the
            previous import.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isReplacing}>
            Keep Existing
          </Button>
          <Button
            variant="destructive"
            onClick={onReplace}
            disabled={isReplacing}
          >
            {isReplacing ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Replacing...
              </>
            ) : (
              "Replace Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
