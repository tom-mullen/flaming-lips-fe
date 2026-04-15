import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/app/lib/api";
import type { EnrichResponse } from "@/app/lib/types";

export function useEnrichTracks() {
  return useMutation({
    mutationFn: (tracks: Record<string, string>[]) =>
      apiPost<EnrichResponse>("/songs/enrich", { tracks }),
  });
}
