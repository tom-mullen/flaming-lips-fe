import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiDelete } from "@/app/lib/api";
import type { Alias } from "@/app/lib/types";
import { queries } from "./keys";

export function useAliasesByWork(workId: string) {
  return useQuery({
    ...queries.aliases.byWork(workId),
    queryFn: ({ signal }) =>
      api<Alias[]>(`/works/${workId}/aliases`, { signal }),
    enabled: !!workId,
  });
}

export function useUpsertAlias(workId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      alias_title: string;
      alias_artist?: string;
      source?: string;
    }) => apiPost<Alias>(`/works/${workId}/aliases`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.aliases._def }),
  });
}

export function useDeleteAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aliasId: string) => apiDelete(`/aliases/${aliasId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.aliases._def }),
  });
}
