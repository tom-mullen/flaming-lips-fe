import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LookupResponse, WorkEnrichmentResult } from "@/app/lib/types";

interface EnrichStore {
  current: LookupResponse | null;
  history: LookupResponse[];
  setCurrent: (response: LookupResponse | null) => void;
  pushToHistory: (response: LookupResponse) => void;
  // applyWorkEnrichment merges a successful PATCH response into the
  // current lookup so the re-rendered card carries the fresh
  // last_enriched_at + any patched fields. Session-persisted, so the
  // "last updated on …" label survives a page refresh.
  applyWorkEnrichment: (workId: string, result: WorkEnrichmentResult) => void;
}

export const useEnrichStore = create<EnrichStore>()(
  persist(
    (set) => ({
      current: null,
      history: [],
      setCurrent: (response) => set({ current: response }),
      pushToHistory: (response) =>
        set((state) => ({ history: [response, ...state.history] })),
      applyWorkEnrichment: (workId, result) =>
        set((state) => {
          if (!state.current) return state;
          const results = state.current.results.map((r) => {
            if (r.matches?.work?.id !== workId) return r;
            return {
              ...r,
              matches: {
                ...r.matches,
                work: result.work,
                recording: result.recording ?? r.matches?.recording,
              },
            };
          });
          return { current: { ...state.current, results } };
        }),
    }),
    {
      name: "enrich-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
