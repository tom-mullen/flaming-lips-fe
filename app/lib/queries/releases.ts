import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch, apiDelete } from "@/app/lib/api";
import type { Release } from "@/app/lib/types";
import { queries } from "./keys";

export function useRelease(id: string) {
  return useQuery({
    ...queries.releases.detail(id),
    queryFn: ({ signal }) => api<Release>(`/releases/${id}`, { signal }),
    enabled: !!id,
  });
}

export function useCreateRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      upc?: string;
      label?: string;
      release_type?: string;
    }) => apiPost<Release>("/releases", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.releases._def }),
  });
}

export function useUpdateRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      upc?: string;
      label?: string;
      release_type?: string;
    }) => apiPatch(`/releases/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.releases._def }),
  });
}

export function useDeleteRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/releases/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.releases._def }),
  });
}
