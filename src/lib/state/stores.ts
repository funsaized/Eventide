/**
 * Zustand State Stores
 *
 * Global UI state management for filters, upload progress, and user preferences.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TradeSide, TradeFilter } from "../db/types";

// ============================================================================
// FILTER STORE
// ============================================================================

interface FilterState {
  // Trade journal filters
  dateRange: { start: string; end: string } | null;
  categories: string[];
  symbols: string[];
  sides: TradeSide[];
  minPnl: number | null;
  maxPnl: number | null;
  status: "OPEN" | "CLOSED" | "ALL";

  // Pagination
  page: number;
  pageSize: number;

  // Actions
  setDateRange: (range: { start: string; end: string } | null) => void;
  setCategories: (categories: string[]) => void;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  setSymbols: (symbols: string[]) => void;
  setSides: (sides: TradeSide[]) => void;
  setMinPnl: (value: number | null) => void;
  setMaxPnl: (value: number | null) => void;
  setStatus: (status: "OPEN" | "CLOSED" | "ALL") => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  clearFilters: () => void;
  getFilter: () => TradeFilter;
}

const defaultFilterState = {
  dateRange: null,
  categories: [],
  symbols: [],
  sides: [],
  minPnl: null,
  maxPnl: null,
  status: "ALL" as const,
  page: 1,
  pageSize: 50,
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      ...defaultFilterState,

      setDateRange: (range) => set({ dateRange: range, page: 1 }),
      setCategories: (categories) => set({ categories, page: 1 }),
      addCategory: (category) =>
        set((state) => ({
          categories: state.categories.includes(category)
            ? state.categories
            : [...state.categories, category],
          page: 1,
        })),
      removeCategory: (category) =>
        set((state) => ({
          categories: state.categories.filter((c) => c !== category),
          page: 1,
        })),
      setSymbols: (symbols) => set({ symbols, page: 1 }),
      setSides: (sides) => set({ sides, page: 1 }),
      setMinPnl: (value) => set({ minPnl: value, page: 1 }),
      setMaxPnl: (value) => set({ maxPnl: value, page: 1 }),
      setStatus: (status) => set({ status, page: 1 }),
      setPage: (page) => set({ page }),
      setPageSize: (size) => set({ pageSize: size, page: 1 }),
      clearFilters: () => set(defaultFilterState),

      getFilter: () => {
        const state = get();
        return {
          dateRange: state.dateRange ?? undefined,
          categories: state.categories.length > 0 ? state.categories : undefined,
          symbols: state.symbols.length > 0 ? state.symbols : undefined,
          sides: state.sides.length > 0 ? state.sides : undefined,
          minPnl: state.minPnl ?? undefined,
          maxPnl: state.maxPnl ?? undefined,
          status: state.status,
        };
      },
    }),
    {
      name: "rubbin-hood-filters",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist certain filter values
        pageSize: state.pageSize,
        status: state.status,
      }),
    }
  )
);

// ============================================================================
// UPLOAD STORE
// ============================================================================

export type UploadStatus =
  | "idle"
  | "parsing"
  | "validating"
  | "preview"
  | "importing"
  | "success"
  | "error";

export type ParseSectionStatus = "pending" | "parsing" | "success" | "error";

interface ParseSection {
  name: string;
  status: ParseSectionStatus;
  message?: string;
  rowCount?: number;
}

interface UploadState {
  // Upload status
  status: UploadStatus;
  progress: number; // 0-100

  // File info
  fileName: string | null;
  fileSize: number | null;

  // Parsing progress
  sections: ParseSection[];
  currentSection: string | null;

  // Error info
  error: string | null;
  errorDetails: string[];

  // Preview data
  previewData: {
    tradeCount: number;
    netLiquidity: number | null;
    statementDate: string | null;
    periodStart: string | null;
    periodEnd: string | null;
  } | null;

  // Duplicate detection
  isDuplicate: boolean;
  existingImportId: string | null;

  // Actions
  startUpload: (fileName: string, fileSize: number) => void;
  setStatus: (status: UploadStatus) => void;
  setProgress: (progress: number) => void;
  setSectionStatus: (sectionName: string, status: ParseSectionStatus, message?: string, rowCount?: number) => void;
  setError: (error: string, details?: string[]) => void;
  setPreviewData: (data: UploadState["previewData"]) => void;
  setDuplicate: (isDuplicate: boolean, existingImportId?: string) => void;
  reset: () => void;
}

const defaultUploadState = {
  status: "idle" as UploadStatus,
  progress: 0,
  fileName: null,
  fileSize: null,
  sections: [],
  currentSection: null,
  error: null,
  errorDetails: [],
  previewData: null,
  isDuplicate: false,
  existingImportId: null,
};

export const useUploadStore = create<UploadState>((set) => ({
  ...defaultUploadState,

  startUpload: (fileName, fileSize) =>
    set({
      ...defaultUploadState,
      status: "parsing",
      fileName,
      fileSize,
      sections: [
        { name: "Header", status: "pending" },
        { name: "Trades", status: "pending" },
        { name: "P&L Summary", status: "pending" },
        { name: "Journal Entries", status: "pending" },
        { name: "Account Summary", status: "pending" },
      ],
    }),

  setStatus: (status) => set({ status }),

  setProgress: (progress) => set({ progress }),

  setSectionStatus: (sectionName, status, message, rowCount) =>
    set((state) => ({
      sections: state.sections.map((s) =>
        s.name === sectionName
          ? { ...s, status, message, rowCount }
          : s
      ),
      currentSection: status === "parsing" ? sectionName : state.currentSection,
    })),

  setError: (error, details = []) =>
    set({
      status: "error",
      error,
      errorDetails: details,
    }),

  setPreviewData: (data) =>
    set({
      status: "preview",
      previewData: data,
    }),

  setDuplicate: (isDuplicate, existingImportId) =>
    set({
      isDuplicate,
      existingImportId: existingImportId ?? null,
    }),

  reset: () => set(defaultUploadState),
}));

// ============================================================================
// USER PREFERENCES STORE
// ============================================================================

interface UserPreferencesState {
  // View preferences
  defaultView: "dashboard" | "trades" | "analytics";
  dateFormat: string;

  // Win rate display preference
  winRateMode: "count" | "volume";

  // Demo mode
  isDemo: boolean;

  // Actions
  setDefaultView: (view: "dashboard" | "trades" | "analytics") => void;
  setDateFormat: (format: string) => void;
  setWinRateMode: (mode: "count" | "volume") => void;
  setIsDemo: (isDemo: boolean) => void;
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      defaultView: "dashboard",
      dateFormat: "MM/DD/YYYY",
      winRateMode: "count",
      isDemo: false,

      setDefaultView: (view) => set({ defaultView: view }),
      setDateFormat: (format) => set({ dateFormat: format }),
      setWinRateMode: (mode) => set({ winRateMode: mode }),
      setIsDemo: (isDemo) => set({ isDemo }),
    }),
    {
      name: "rubbin-hood-preferences",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================================
// UI STATE STORE
// ============================================================================

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;

  // Modals
  activeModal: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  activeModal: null,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
}));
