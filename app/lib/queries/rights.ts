import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiDelete } from "@/app/lib/api";
import { queries } from "./keys";

export function useAddRight(catalogId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      work_id: string;
      type: string;
      territory: string;
      ownership: number;
      start_date: string;
      end_date: string;
      source: string;
    }) => apiPost(`/catalogs/${catalogId}/rights`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.catalogs._def }),
  });
}

export function useRemoveRight(catalogId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rightId: string) =>
      apiDelete(`/catalogs/${catalogId}/rights/${rightId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.catalogs._def }),
  });
}

export function useBatchRemoveRights(catalogId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rightIds: string[]) =>
      apiPost(`/catalogs/${catalogId}/rights/batch-delete`, { right_ids: rightIds }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.catalogs._def }),
  });
}
