import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPatch, apiPost } from "@/app/lib/api";
import type {
  EnrichedTrack,
  LookupResponse,
  WorkEnrichmentResult,
} from "@/app/lib/types";
import { queries } from "./keys";

export function useEnrichTracks() {
  return useMutation({
    mutationFn: (tracks: Record<string, string>[]) =>
      apiPost<LookupResponse>("/enrichments/lookup", { tracks }),
  });
}

// useApplyEnrichment patches a work (and its matching recording) with
// Spotify-derived fields. Fill-blanks by default; overwrite=true lets
// Spotify data win field-by-field.
export function useApplyEnrichment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workId,
      track,
      overwrite,
    }: {
      workId: string;
      track: EnrichedTrack;
      overwrite: boolean;
    }) =>
      apiPatch<WorkEnrichmentResult>(`/works/${workId}/enrichments`, {
        track,
        overwrite,
      }),
    onSuccess: () => {
      // Updated work + recording fields land in both trees; invalidate
      // both so any open list/detail views refetch.
      qc.invalidateQueries({ queryKey: queries.works._def });
      qc.invalidateQueries({ queryKey: queries.recordings._def });
    },
  });
}
