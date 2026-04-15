import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { EnrichResponse } from "@/app/lib/types";

interface EnrichStore {
  current: EnrichResponse | null;
  history: EnrichResponse[];
  setCurrent: (response: EnrichResponse | null) => void;
  pushToHistory: (response: EnrichResponse) => void;
}

export const useEnrichStore = create<EnrichStore>()(
  persist(
    (set) => ({
      current: null,
      history: [],
      setCurrent: (response) => set({ current: response }),
      pushToHistory: (response) =>
        set((state) => ({ history: [response, ...state.history] })),
    }),
    {
      name: "enrich-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
