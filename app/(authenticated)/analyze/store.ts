import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Step, AnalyzeDocument } from "./types";

interface AnalyzeBookmark {
  step: Step;
  catalogId: string;
  catalogName: string;
  batchId: string;
  enrichJobId: string | null;
  documents: AnalyzeDocument[];
  skipped: { filename: string; reason: string }[];
  enrichedCount: number;
  createdAt: number;
}

interface AnalyzeStore extends AnalyzeBookmark {
  _hydrated: boolean;
  save: (patch: Partial<AnalyzeBookmark>) => void;
  clear: () => void;
  isStale: () => boolean;
}

const MAX_AGE = 24 * 60 * 60 * 1000;

const INITIAL: AnalyzeBookmark = {
  step: "drop",
  catalogId: "",
  catalogName: "",
  batchId: "",
  enrichJobId: null,
  documents: [],
  skipped: [],
  enrichedCount: 0,
  createdAt: 0,
};

export const useAnalyzeStore = create<AnalyzeStore>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      _hydrated: false,
      save: (patch) =>
        set((state) => ({
          ...state,
          ...patch,
          createdAt: state.createdAt || Date.now(),
        })),
      clear: () => set({ ...INITIAL }),
      isStale: () => {
        const { createdAt } = get();
        return !createdAt || Date.now() - createdAt > MAX_AGE;
      },
    }),
    {
      name: "analyze-session",
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true;
      },
      partialize: (state) => ({
        step: state.step,
        catalogId: state.catalogId,
        catalogName: state.catalogName,
        batchId: state.batchId,
        enrichJobId: state.enrichJobId,
        documents: state.documents,
        skipped: state.skipped,
        enrichedCount: state.enrichedCount,
        createdAt: state.createdAt,
      }),
    },
  ),
);

export function useAnalyzeStoreHydrated() {
  return useAnalyzeStore((s) => s._hydrated);
}
