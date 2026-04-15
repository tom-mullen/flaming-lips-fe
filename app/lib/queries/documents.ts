import { useQuery } from "@tanstack/react-query";
import { api } from "@/app/lib/api";
import type { CatalogDocument, Page } from "@/app/lib/types";
import { queries } from "./keys";

export function useDocuments(catalogId: string) {
  return useQuery({
    ...queries.documents.byCatalog(catalogId),
    queryFn: ({ signal }) =>
      api<Page<CatalogDocument>>(`/catalogs/${catalogId}/documents`, { signal }),
  });
}
