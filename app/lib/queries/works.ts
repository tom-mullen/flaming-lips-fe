import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch } from "@/app/lib/api";
import type { Work, Page } from "@/app/lib/types";
import { queries } from "./keys";

export function useWorks() {
  return useQuery({
    ...queries.works.all,
    queryFn: ({ signal }) => api<Page<Work>>("/works", { signal }),
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
