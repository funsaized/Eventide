/**
 * Zustand State Stores
 *
 * Global UI state management for filters, upload progress, and user preferences.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StateCreator } from "zustand";
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

type FilterStoreSet = Parameters<StateCreator<FilterState>>[0];

const defaultFilterState: Pick<
  FilterState,
  | "dateRange"
  | "categories"
  | "symbols"
  | "sides"
  | "minPnl"
  | "maxPnl"
  | "status"
  | "page"
  | "pageSize"
> = {
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

const setFilterField = <K extends keyof typeof defaultFilterState>(
  set: FilterStoreSet,
  field: K,
  value: (typeof defaultFilterState)[K]
) =>
  set((state) => ({
    ...state,
    [field]: value,
    page: 1,
  }));

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      ...defaultFilterState,

      setDateRange: (range) => setFilterField(set, "dateRange", range),
      setCategories: (categories) => setFilterField(set, "categories", categories),
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
      setSymbols: (symbols) => setFilterField(set, "symbols", symbols),
      setSides: (sides) => setFilterField(set, "sides", sides),
      setMinPnl: (value) => setFilterField(set, "minPnl", value),
      setMaxPnl: (value) => setFilterField(set, "maxPnl", value),
      setStatus: (status) => setFilterField(set, "status", status),
      setPage: (page) => set({ page }),
      setPageSize: (size) => setFilterField(set, "pageSize", size),
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
// USER PREFERENCES STORE
// ============================================================================

interface UserPreferencesState {
  // View preferences
  defaultView: "dashboard" | "trades" | "analytics";
  dateFormat: string;

  // Win rate display preference
  winRateMode: "count" | "volume";

  // Actions
  setDefaultView: (view: "dashboard" | "trades" | "analytics") => void;
  setDateFormat: (format: string) => void;
  setWinRateMode: (mode: "count" | "volume") => void;
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      defaultView: "dashboard",
      dateFormat: "MM/DD/YYYY",
      winRateMode: "count",

      setDefaultView: (view) => set({ defaultView: view }),
      setDateFormat: (format) => set({ dateFormat: format }),
      setWinRateMode: (mode) => set({ winRateMode: mode }),
    }),
    {
      name: "rubbin-hood-preferences",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface AppModeState {
  isDemo: boolean;
  setIsDemo: (isDemo: boolean) => void;
}

export const useAppModeStore = create<AppModeState>()(
  persist(
    (set) => ({
      isDemo: false,
      setIsDemo: (isDemo) => set({ isDemo }),
    }),
    {
      name: "rubbin-hood-app-mode",
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
