import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch } from "@/app/lib/api";
import type { Job, Work, Page } from "@/app/lib/types";
import { queries } from "./keys";

export function useWorks() {
  return useQuery({
    ...queries.works.all,
    // Fetch all pages client-side — mirrors useDocuments. The backend
    // paginates with opaque cursors (default limit 100, max 500); this
    // flattens every page so the UI can use numeric pagination over
    // the full set.
    queryFn: async ({ signal }) => {
      const items: Work[] = [];
      let cursor: string | undefined;
      do {
        const qs = new URLSearchParams({ limit: "500" });
        if (cursor) qs.set("cursor", cursor);
        const page = await api<Page<Work>>(`/works?${qs.toString()}`, {
          signal,
        });
        items.push(...page.items);
        cursor = page.next_cursor;
      } while (cursor);
      return { items, next_cursor: undefined } satisfies Page<Work>;
    },
  });
}

export function useWork(id: string) {
  return useQuery({
    ...queries.works.detail(id),
    queryFn: ({ signal }) => api<Work>(`/works/${id}`, { signal }),
    enabled: !!id,
  });
}

export function useCreateWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      canonical_title: string;
      canonical_artist: string;
      iswc?: string;
    }) => apiPost<Work>("/works", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.works._def }),
  });
}

export function useUpdateWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      canonical_title?: string;
      canonical_artist?: string;
      iswc?: string;
    }) => apiPatch(`/works/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.works._def }),
  });
}

export function useBatchDeleteWorks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiPost("/works/batch-delete", { work_ids: ids }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.works._def }),
  });
}

// useEnrichWorks kicks off a batch enrichment job. Returns the tracking
// Job so the caller can open the /jobs/{id}/stream WebSocket for
// progress events. Cache invalidation happens after the stream
// completes, not here — the returned Job is still "pending" at this
// point.
export function useEnrichWorks() {
  return useMutation({
    mutationFn: ({
      work_ids,
      overwrite,
    }: {
      work_ids: string[];
      overwrite: boolean;
    }) =>
      apiPost<Job>("/jobs", {
        type: "enrich_works",
        params: { work_ids, overwrite },
      }),
  });
}
