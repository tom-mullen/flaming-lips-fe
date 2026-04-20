import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Step, AnalyzeDocument } from "./types";

// Works are NOT persisted — they're rebuilt from the batch stream replay on
// restore, and their nested recordings/releases arrays blow past the ~5MB
// sessionStorage quota on larger batches.
// Issue-related lists (batch_issues, parse_result_issues, parsed_row_issues)
// are NOT persisted — they are durable on the server and fetched fresh on
// restore from their dedicated endpoints, so sessionStorage doesn't need to
// carry them.
interface AnalyzeBookmark {
  step: Step;
  catalogId: string;
  catalogName: string;
  batchId: string;
  documents: AnalyzeDocument[];
  parseCompleteCount: number;
  ingestCompleteCount: number;
  royaltyLinesExpectedCount: number;
  royaltyLinesCompleteCount: number;
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
  documents: [],
  parseCompleteCount: 0,
  ingestCompleteCount: 0,
  royaltyLinesExpectedCount: 0,
  royaltyLinesCompleteCount: 0,
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
        documents: state.documents,
        parseCompleteCount: state.parseCompleteCount,
        ingestCompleteCount: state.ingestCompleteCount,
        royaltyLinesExpectedCount: state.royaltyLinesExpectedCount,
        royaltyLinesCompleteCount: state.royaltyLinesCompleteCount,
        createdAt: state.createdAt,
      }),
    },
  ),
);

export function useAnalyzeStoreHydrated() {
  return useAnalyzeStore((s) => s._hydrated);
}
