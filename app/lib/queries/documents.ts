import { useQuery } from "@tanstack/react-query";
import { api } from "@/app/lib/api";
import type { CatalogDocument, Page } from "@/app/lib/types";
import { queries } from "./keys";

export function useDocuments(catalogId: string) {
  return useQuery({
    ...queries.documents.byCatalog(catalogId),
    queryFn: async ({ signal }) => {
      const items: CatalogDocument[] = [];
      let cursor: string | undefined;
      do {
        const qs = new URLSearchParams({ limit: "500" });
        if (cursor) qs.set("cursor", cursor);
        const page = await api<Page<CatalogDocument>>(
          `/catalogs/${catalogId}/documents?${qs.toString()}`,
          { signal },
        );
        items.push(...page.items);
        cursor = page.next_cursor;
      } while (cursor);
      return { items, next_cursor: undefined } satisfies Page<CatalogDocument>;
    },
  });
}
