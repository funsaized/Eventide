/**
 * Simple Toast Hook
 *
 * Minimal toast implementation using browser console and alert.
 * Can be replaced with a more sophisticated toast library later.
 */

import { useCallback } from "react";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = useCallback(({ title, description, variant }: ToastOptions) => {
    // Log to console
    const prefix = variant === "destructive" ? "[ERROR]" : "[INFO]";
    console.log(`${prefix} ${title}${description ? `: ${description}` : ""}`);

    // For now, show a subtle notification via console
    // In Phase 14 or later, this can be replaced with a proper toast component
  }, []);

  return { toast };
}
