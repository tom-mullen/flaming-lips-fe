import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch, apiDelete } from "@/app/lib/api";
import type { Catalog, CatalogWithRights, Page } from "@/app/lib/types";
import { queries } from "./keys";

export function useCatalogs() {
  return useQuery({
    ...queries.catalogs.all,
    queryFn: ({ signal }) => api<Page<Catalog>>("/catalogs", { signal }),
  });
}

export function useCatalog(id: string) {
  return useQuery({
    ...queries.catalogs.detail(id),
    queryFn: ({ signal }) =>
      api<CatalogWithRights>(`/catalogs/${id}`, { signal }),
  });
}

export function useCreateCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiPost<Catalog>("/catalogs", { name }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.catalogs._def }),
  });
}

export function useDeleteCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/catalogs/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.catalogs._def }),
  });
}

export function useUpdateCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; status?: string }) =>
      apiPatch(`/catalogs/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.catalogs._def }),
  });
}
