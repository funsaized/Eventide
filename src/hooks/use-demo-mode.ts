"use client";

/**
 * Demo Mode Hook
 *
 * Handles demo mode lifecycle:
 * - Auto-seeds demo data on first visit (no real data present)
 * - Provides transition from demo to real data
 * - Manages demo state in preferences store
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserPreferencesStore } from "@/lib/state/stores";
import { hasData } from "@/lib/db/queries/dashboard";
import { seedDemoData, wipeDemoData, hasOnlyDemoData } from "@/lib/demo/generate-demo-db";

/**
 * Hook to initialize demo mode on first visit
 * Should be called once in the app layout
 */
export function useDemoInit() {
  const setIsDemo = useUserPreferencesStore((s) => s.setIsDemo);
  const queryClient = useQueryClient();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      try {
        const dataExists = await hasData();

        if (!dataExists) {
          // No data at all — seed demo data
          await seedDemoData();
          setIsDemo(true);
          // Invalidate queries so UI picks up the new data
          await queryClient.invalidateQueries();
        } else {
          // Data exists — check if it's only demo data
          const onlyDemo = await hasOnlyDemoData();
          setIsDemo(onlyDemo);
        }
      } catch (error) {
        console.error("[Demo] Failed to initialize demo mode:", error);
      }
    }

    init();
  }, [setIsDemo, queryClient]);
}

/**
 * Hook for demo-to-real data transition
 * Returns helpers for the upload flow
 */
export function useDemoTransition() {
  const isDemo = useUserPreferencesStore((s) => s.isDemo);
  const setIsDemo = useUserPreferencesStore((s) => s.setIsDemo);
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  /**
   * Call this before starting a real import while in demo mode.
   * If in demo mode, shows the confirmation modal.
   * If not in demo mode, calls onProceed immediately.
   */
  const checkDemoTransition = useCallback(
    (files: File[], onProceed: (files: File[]) => void) => {
      if (!isDemo) {
        onProceed(files);
        return;
      }
      setPendingFiles(files);
      setShowModal(true);
    },
    [isDemo]
  );

  /**
   * Confirm demo transition: wipe demo data, then proceed with real import
   */
  const confirmTransition = useCallback(
    async (onProceed: (files: File[]) => void) => {
      if (pendingFiles.length === 0) return;

      try {
        await wipeDemoData();
        setIsDemo(false);
        await queryClient.invalidateQueries();
        setShowModal(false);
        onProceed(pendingFiles);
      } catch (error) {
        console.error("[Demo] Failed to wipe demo data:", error);
      } finally {
        setPendingFiles([]);
      }
    },
    [pendingFiles, setIsDemo, queryClient]
  );

  const cancelTransition = useCallback(() => {
    setShowModal(false);
    setPendingFiles([]);
  }, []);

  return {
    isDemo,
    showModal,
    checkDemoTransition,
    confirmTransition,
    cancelTransition,
  };
}
